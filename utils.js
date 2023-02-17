/* eslint no-autofix/strict: 0 */ // --> OFF
// --> OFF
/**
 * wpe_restlet_utils.js
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

/** WPE Restlet Utils
 *
 * Module History:
 *   Version         Date            Author          Remarks
 *   1.1             Sept 24 2021    Blake Versiga   Upadate between to accept null for endString
 *   1.2             June 13 2022    Blake Versiga   Added WPE Error Log functions
 *
 *
 */
'use strict';

define([
    'N/currency',
    'N/error',
    'N/url',
    'N/ui/message',
    'N/search',
    'N/record',
    'N/format',
    'N/file',
    'N/https',
    'N/email',
    './wpe_esm_config',
    'N/query'
], function (currency, error, url, message, search, record, format, file, https, email, EsmConfig, query) {
    function buildSearch(type, filters, columns) {
        return runSearch({
            type: type,
            filters: filters,
            columns: columns
        }).map(function (r) {
            let obj = {};
            for (let key in columns) {
                obj[key] = r.getValue(columns[key]);
            }
            return obj;
        });
    }

    function runSearch(params) {
        if (!Array.isArray(params.columns) && typeof params.columns === 'object') {
            params.columns = Object.keys(params.columns).map(function (c) {
                return params.columns[c];
            });
        }
        let fullSearch = search.create(params).run();
        let results = [];
        let chunk = [];
        let index = 0;
        do {
            chunk = fullSearch.getRange({ start: 1000 * index, end: 1000 * (index + 1) }) || [];
            results = results.concat(chunk);
            index++;
        } while (chunk.length === 1000);

        return results;
    }

    /**
     * Get all of yesterdays payouts
     * @param {object} headerObj - Header object with bearer authorization token from script paramters.
     */
    function returnError(e) {
        let errorMessage = e.message;
        let custom_error = error.create({
            name: '400',
            message: errorMessage,
            notifyOff: false
        });
        custom_error.toString = function () {
            return custom_error.message;
        };
        throw custom_error;
    }

    /**
     * Safe function to check for null, empty, or whitespace characters
     * @param {any} input
     *
     * @returns {string} - Returns true if the input is null, empty string or undefined
     */
    function isNullOrWhitespace(input) {
        if (typeof input === 'string') {
            return !input || !input.trim();
        }
        if (typeof input === 'undefined' || input === null) {
            return true;
        }
        return false;
    }

    /**
     *
     * @param {string} scriptId - scriptId for the suitelet
     * @param {*} deploymentId - deploymentId for the suitelet
     * @param {object} params - Array of key value pairs EX. [['action', 'CREATEBADDEBTINVOICE'], ['itemId', BAD_DEBT_ADJUSTMENT_ITEM]]
     * @param {bool} returnExternalUrl - if true the URL is returned as an external url otherwise it is returned as an internal URL
     */
    function createSuiteletURL(scriptId, deploymentId, params, returnExternalUrl = false) {
        let baseURL = url.resolveScript({ scriptId: scriptId, deploymentId: deploymentId, returnExternalUrl: returnExternalUrl });

        if (params) {
            for (let i = 0; i < params.length; i++) {
                baseURL += '&' + params[i][0] + '=' + params[i][1];
            }
        }
        return baseURL;
    }

    function formatMessage(messages) {
        // {message: value, success: success}
        let rows = '';
        for (let i = 0; i < messages.length; i++) {
            rows +=
                '<tr><td style="width: 500px;">' +
                messages[i].message +
                '</td><td style="width: 300px;">' +
                messages[i].success +
                '</td></tr>';
        }
        let html = '<table><tbody>' + rows + '</tbody></table>';
        console.log('html: ' + html);
        return html;
    }

    function showMessage(myTitle, myMessage, myType, myDuration) {
        let myMsg = message.create({ title: myTitle, message: myMessage, type: myType });
        if (myDuration) {
            myMsg.show({
                duration: myDuration
            });
        } else {
            myMsg.show();
        }

        //console.log('Showing A Message', myMessage);
        return myMsg;
    }

    async function pausecomp(milliseconds) {
        await new Promise((r) => setTimeout(r, milliseconds));
        // var date = new Date();
        // var curDate = null;
        // do {
        //     curDate = new Date();
        // } while (curDate - date < millis);
    }

    /**
     *
     * @param {int} subscriptionPlanId
     * @returns {int} lineCount - number of IN_ADVANCE lines on a subscription plan
     */
    function getInAdvancedLineCount(subscriptionPlanId) {
        let lineCount = 0;
        let billingMode = '';
        let lines = 0;
        if (getInt(subscriptionPlanId) > 0) {
            let subPlan = record.load({
                type: record.Type.SUBSCRIPTION_PLAN,
                id: subscriptionPlanId,
                isDynamic: true
            });
            lines = subPlan.getLineCount({ sublistId: 'member' });

            for (let i = 0; i < lines; i++) {
                let billingmode = subPlan.getSublistValue({ sublistId: 'member', fieldId: 'billingmode', line: i });
                log.debug('billingmode', billingmode);
                if (billingmode === 'IN_ADVANCE') {
                    lineCount++;
                }
            }
        }
        return lineCount;
    }

    /**
     *
     * @param {string - required} customerId - customer Id for which to retrieve the department and location
     * @param {string} transactionType - if null or empty, it will return the department and location of the first transaction,
     *                                   otherwise it will look for the passed transaction type
     */
    function getCustomerDefaultDepartmentAndLocation(customerId, transactionType) {
        let departmentAndLocation = { department: '', location: '' };
        let netsuiteTransactionType = transactionType;
        if (!isNullOrWhitespace(customerId)) {
            if (!isNullOrWhitespace(netsuiteTransactionType)) {
                netsuiteTransactionType = netsuiteTransactionType.toLowerCase();
            }
            let filters = [['name', 'anyof', customerId], 'AND', ['mainline', 'is', 'T']];
            if (!isNullOrWhitespace(netsuiteTransactionType)) {
                filters.push('AND');
                filters.push(['type', 'anyof', 'CustInvc']);
            }
            let columns = [
                'ordertype',
                'location',
                'department',
                'type',
                'transactionnumber',
                search.createColumn({
                    name: 'trandate',
                    sort: search.Sort.DESC
                })
            ];
            let transactionSearchObj = search.create({
                type: 'transaction',
                filters: filters,
                columns: columns
            });
            log.debug('search', JSON.stringify(transactionSearchObj.run()));

            transactionSearchObj.run().each(function (result) {
                log.debug('getCustomerDefaultDepartmentAndLocation result', JSON.stringify(result));
                departmentAndLocation.locationId = result.getValue({ name: 'location' });
                departmentAndLocation.departmentId = result.getValue({ name: 'department' });
                return false;
            });
        }
        return departmentAndLocation;
    }

    /**

     * Returns a Netsuite Date for Today
     */
    function getToday() {
        let today = format.format({
            value: new Date(),
            type: format.Type.DATE
        });
        return new Date(today);
    }

    /*
     * @param {object} obj
     *     {string}  obj.logLevel - 1=Debug, 2=Error 3=Audit
     *     {string}  obj.context - location that produced the log message
     *     {string}  obj.actionType - event type being logged
     *     {string}  obj.message - the log message
     *     {string}  obj.request - the http or restlet request
     *     {string}  obj.response - the http or restlet response
     *     {string}  obj.callstack - exception call stack if available
     *     {string}  obj.link - link to the target.  If not provided a link is created using the record type and record id
     *     {string}  obj.recordType - record type being logged
     *     {string}  obj.recordId - internal id of the record
     *     {string}  obj.transactionId - internal id of the transaction record (links to a transaction)
     *     {string}  obj.entityId - internal id of the entity record (links to a entity)
     *     {string}  obj.itemId - internal id of the item record (links to an item)
     *     {string}  obj.subscriptionId - internal id of the subscription (links to a subscription)
     */
    function wpeLog(obj) {
        try {
            //log.debug('wpeLog obj', JSON.stringify(obj));
            if (obj && !isNullOrWhitespace(obj.message)) {
                let logLevel = (isNullOrWhitespace(obj.logLevel) ? 'DEBUG' : obj.logLevel).toLowerCase();
                // parse parameters
                let context = parse(obj.context);
                let actionType = parse(obj.actionType);
                let logMessage = parse(obj.message);
                let request = parse(obj.request);
                let response = parse(obj.response);
                let callstack = parse(obj.callstack);
                let link = parse(obj.link);
                let recordType = parse(obj.recordType);
                let recordId = parse(obj.recordId);
                let transactionId = parse(obj.transactionId);
                let entityId = parse(obj.entityId);
                let itemId = parse(obj.itemId);
                let subscriptionId = parse(obj.subscriptionId);
                let logExecutionMessage = parseBool(obj.logExecutionMessage);
                // log.debug({
                //      title: 'fields',
                //      details: `message: ${message}, logLevel: ${logLevel}, recordType: ${recordType}, recordId: ${recordId}, link: ${link}, actionType: ${actionType}, context: ${context}, transactionId: ${transactionId}, subscriptionId: ${subscriptionId}, entityId: ${entityId}, itemId: ${itemId}, callstack: ${callstack}, request: ${request}, response: ${response}, logExecutionMessage: ${logExecutionMessage}`
                // });
                createWpeLog(
                    logMessage,
                    logLevel,
                    recordType,
                    recordId,
                    link,
                    actionType,
                    context,
                    transactionId,
                    subscriptionId,
                    entityId,
                    itemId,
                    callstack,
                    request,
                    response,
                    logExecutionMessage
                );
            }
        } catch (error) {
            try {
                log.error('Exception thrown in wpeErrorLog', error.message);
                log.debug('wpeErrorLog obj', JSON.stringify(obj));
            } catch (error) {
                log.error('Exception thrown in wpeErrorLog - Catch', error.message);
            }
        }
    }

    /**
     *
     * @param {object} obj
     *     {string} logMessage - the log message
     *     {string} logLevel - 1=Debug, 2=Error 3=Audit
     *     {string} recordType - record type being logged
     *     {string} recordId - internal id of the record
     *     {string} link - link to the target.  If not provided a link is created using the record type and record id
     *     {string} actionType - event type being logged
     *     {string} context - location that produced the log message
     *     {string} transactionId - internal id of the transaction record (links to a transaction)
     *     {string} subscriptionId - internal id of the subscription (links to a subscription)
     *     {string} entityId - internal id of the entity record (links to a entity)
     *     {string} itemId - internal id of the item record (links to an item)
     *     {string} callstack - exception call stack if available
     *     {string} request - the http or restlet request
     *     {string} response - the http or restlet response
     *     {bool}   logExecutionMessage - if true the message will be logged to the script execution log
     */
    function createWpeLog(
        logMessage,
        logLevel,
        recordType,
        recordId,
        link,
        actionType,
        context,
        transactionId,
        subscriptionId,
        entityId,
        itemId,
        callstack,
        request,
        response,
        logExecutionMessage
    ) {
        try {
            if (isNullOrWhitespace(logMessage)) {
                // Check required field
                //log.debug({ title: 'returning from createWpeLog', details: 'message is empty' });
                return;
            }

            let level = (isNullOrWhitespace(logLevel) ? 'debug' : logLevel).toLowerCase();
            let logLink = link;
            let wpeLogRecord = record.create({
                type: 'customrecord_wpe_log',
                isDynamic: false
            });
            wpeLogRecord.setValue('custrecord_wpe_log_message', logMessage.substr(0, 300));
            wpeLogRecord.setValue('custrecord_wpe_log_level', level);
            wpeLogRecord.setValue('custrecord_wpe_log_type', recordType === '0' ? null : recordType);
            wpeLogRecord.setValue('custrecord_wpe_log_record_id', recordId === '0' ? null : recordId);
            if (isNullOrWhitespace(link) && recordType && recordId && recordId.toString() !== '0') {
                let host = url.resolveDomain({
                    hostType: url.HostType.APPLICATION
                });
                let recordLink = url.resolveRecord({
                    isEditMode: false,
                    recordId: recordId,
                    recordType: recordType
                });
                // log.debug({
                //     title: 'host / recordLink',
                //     details: 'host: ' + host + '   recordLink: ' + recordLink
                // })
                logLink = 'https://' + host + recordLink;
            }
            wpeLogRecord.setValue('custrecord_wpe_log_link', logLink || '');
            wpeLogRecord.setValue('custrecord_wpe_log_action_type', actionType || '');
            wpeLogRecord.setValue('custrecord_wpe_log_context', context || '');
            wpeLogRecord.setValue('custrecord_wpe_log_request', request || '');
            wpeLogRecord.setValue('custrecord_wpe_log_response', response || '');
            wpeLogRecord.setValue('custrecord_wpe_log_call_stack', callstack || '');
            wpeLogRecord.setValue('custrecord_wpe_log_transaction', transactionId === '0' ? null : transactionId);
            wpeLogRecord.setValue('custrecord_wpe_log_entity', entityId === '0' ? null : entityId);
            wpeLogRecord.setValue('custrecord_wpe_log_subscription', subscriptionId === '0' ? null : subscriptionId);
            wpeLogRecord.setValue('custrecord_wpe_log_item', itemId === '0' ? null : itemId);
            wpeLogRecord.save();
            //log.debug({ title: 'wpeLogId', details: wpeLogId });

            //log.debug({ title: 'logExecutionMessage', details: parseBool(logExecutionMessage) });
            if (parseBool(logExecutionMessage)) {
                switch (logLevel) {
                    case 'audit':
                        log.audit('wpeLogMessage', logMessage);
                        break;

                    case 'error':
                        log.error('wpeLogMessage', logMessage);
                        break;

                    case 'emergency':
                        log.emergency('wpeLogMessage', logMessage);
                        break;

                    case 'exception':
                        log.audit('wpeLogMessage', logMessage);
                        break;

                    default:
                        log.debug({ title: 'wpeLogMessage', details: logMessage });
                        break;
                }
            }
        } catch (error) {
            try {
                log.error({ title: 'error creating WPE Log message', details: error.message });
            } catch (error) {
                log.error({ title: 'error creating WPE Log message - Catch', details: error.message });
            }
        }
    }

    /*
     * @param {object} obj
     *     {string}    [obj.message] - the log message
     *     {string}    [obj.location] - location from where the message was logged ex. wpe_restlet_utils-wpeLogError
     *     {string}    [obj.level] - ex 'Debug', 'Error' 'Audit' 'Exception'
     *     {string}    [obj.executionContext] - ex 'create', 'edit' 'xedit' 'approve'
     *     {string}    [obj.callStack] - exception call stack if available
     *     {longText}  [obj.data] - data to be logged
     *     {longText}  [obj.request] - the http or restlet request
     *     {longText}  [obj.response] - the http or restlet response
     *     {employee}  [obj.contactId] - Employee Record for the Primary Contact
     *     {string}    [obj.sendNotification] - If checked a notification will be sent
     *     {script}    [obj.scriptId] - the id of the Executing Script
     *     {employee}  [obj.resolvedById] - Employee that researched the Issue
     *     {string}    [obj.resolution] - Resolution Details
     *     {string}    [obj.emailList] - List of EMails to send
     *     {string}    [obj.slackChannelsList] - List of Slack Channels to notify
     *     {bool}      [obj.logExecutionMessage] - if true, the message with be written to the Script Execution Log
     */
    function wpeErrorLog(obj) {
        try {
            //log.debug('wpeLog obj', JSON.stringify(obj));
            if (obj && !isNullOrWhitespace(obj.message)) {
                let level = (isNullOrWhitespace(obj.level) ? 'DEBUG' : obj.level).toLowerCase();
                // parse parameters
                let logMessage = parse(obj.message);
                let location = parse(obj.location);
                if (isNullOrWhitespace(location) && !isNullOrWhitespace(obj.context)) {
                    location = parse(obj.context);
                }
                let executionContext = parse(obj.executionContext);
                let callStack = parse(obj.callStack);
                if (isNullOrWhitespace(callStack) && !isNullOrWhitespace(obj.callstack)) {
                    callStack = parse(obj.callstack);
                }
                let data = parse(obj.data);
                let request = parse(obj.request);
                let response = parse(obj.response);
                let contactId = getInt(obj.contactId) > 0 ? getInt(obj.contactId) : null;
                let sendNotification = parse(obj.sendNotification);
                let scriptId = getInt(obj.scriptId) > 0 ? getInt(obj.scriptId) : null;
                let resolvedById = getInt(obj.resolvedById) > 0 ? getInt(obj.resolvedById) : null;
                let resolution = parse(obj.resolution);
                let emailList = parse(obj.emailList);
                let slackChannelsList = Array.isArray(obj.slackChannelsList) ? obj.slackChannelsList : parse(obj.slackChannelsList);
                let logExecutionMessage = parseBool(obj.logExecutionMessage);

                let link = parse(obj.link);
                let recordType = parse(obj.recordType);
                let recordId = getInt(obj.recordId);
                let transactionId = getInt(obj.transactionId);
                let entityId = getInt(obj.entityId);
                let itemId = getInt(obj.itemId);
                let subscriptionId = getInt(obj.subscriptionId);

                if (isNullOrWhitespace(link) && !isNullOrWhitespace(recordType) && getInt(recordId) > 0) {
                    let host = url.resolveDomain({
                        hostType: url.HostType.APPLICATION
                    });
                    let recordLink = url.resolveRecord({
                        isEditMode: false,
                        recordId: recordId,
                        recordType: recordType
                    });
                    link = 'https://' + host + recordLink;
                }
                let emailAuthorId = getInt(obj.emailAuthorId) > 0 ? getInt(obj.emailAuthorId) : null;

                createWpeErrorLog(
                    logMessage,
                    location,
                    level,
                    executionContext,
                    callStack,
                    data,
                    request,
                    response,
                    contactId,
                    sendNotification,
                    scriptId,
                    resolvedById,
                    resolution,
                    emailList,
                    slackChannelsList,
                    logExecutionMessage,
                    link,
                    recordType,
                    recordId,
                    transactionId,
                    entityId,
                    subscriptionId,
                    itemId,
                    emailAuthorId
                );
            }
        } catch (error) {
            try {
                log.error('Exception thrown in wpeErrorLog', error.message);
                log.debug('wpeErrorLog obj', JSON.stringify(obj));
            } catch (error) {
                log.error('Exception thrown in wpeErrorLog - Catch', error.message);
            }
        }
    }

    /*
     * @param {object} obj
     *     {string}    logMessage - the log message
     *     {string}    location - location from where the message was logged ex. wpe_restlet_utils-wpeLogError
     *     {string}    level - ex 'Debug', 'Error' 'Audit' 'Exception'
     *     {string}    executionContext - ex 'create', 'edit' 'xedit' 'approve'
     *     {string}    callStack - exception call stack if available
     *     {longText}  data - data to be logged
     *     {longText}  request - the http or restlet request
     *     {longText}  response - the http or restlet response
     *     {employee}  contactId - Employee Record for the Primary Contact
     *     {string}    sendNotification - If checked a notification will be sent
     *     {script}    scriptId - Executing Script
     *     {employee}  resolvedById - Employee that researched the Issue
     *     {string}    resolution - Resolution Details
     *     {bool}      logExecutionMessage - if true, the message with be written to the Script Execution Log
     */
    function createWpeErrorLog(
        logMessage,
        location,
        level,
        executionContext = '',
        callStack = '',
        data = '',
        request = '',
        response = '',
        contactId = null,
        sendNotification = '',
        scriptId = null,
        resolvedById = null,
        resolution = '',
        emailList = '',
        slackChannelsList = '',
        logExecutionMessage = false,
        link = null,
        recordType = '',
        recordId = null,
        transactionId = null,
        entityId = null,
        subscriptionId = null,
        itemId = null,
        emailAuthorId = null
    ) {
        try {
            if (isNullOrWhitespace(logMessage)) {
                // Check required field
                log.debug({ title: 'returning from createWpeErrorLog', details: 'logMessage is empty' });
                return;
            }

            let logLevel = (isNullOrWhitespace(level) ? 'debug' : level).toLowerCase();

            // let wpeErrorLog = new errorLog();

            let wpeErrorLogRecord = record.create({
                type: 'customrecord_wpe_error_log',
                isDynamic: false
            });
            // wpeErrorLog.message = logMessage.substr(0, 300);
            // wpeErrorLog.location = parse(location);
            // wpeErrorLog.level = parse(level);
            // wpeErrorLog.executionContext = parse(executionContext);
            // wpeErrorLog.callStack = parse(callStack);
            // wpeErrorLog.data = parse(data);
            // wpeErrorLog.request = parse(request);
            // wpeErrorLog.response = parse(response);
            // wpeErrorLog.contactId = getInt(contactId) === 0 ? null : getInt(contactId);
            // wpeErrorLog.sendNotification = sendNotification;
            // wpeErrorLog.scriptId = getInt(scriptId) === 0 ? null : getInt(scriptId);
            // wpeErrorLog.resolvedById = getInt(resolvedById) === 0 ? null : getInt(resolvedById);
            // wpeErrorLog.resolution = parse(resolution);
            // wpeErrorLog.emailList = parse(emailList);
            // wpeErrorLog.slackChannelsList = parse(slackChannelsList);
            // wpeErrorLog.logExecutionMessage = parse(logExecutionMessage);
            // wpeErrorLog.link = parse(link);
            // wpeErrorLog.recordType = parse(recordType);
            // wpeErrorLog.recordId = getInt(recordId) === 0 ? null : getInt(recordId);
            // wpeErrorLog.transactionId = getInt(transactionId) === 0 ? null : getInt(transactionId);
            // wpeErrorLog.entityId = getInt(entityId) === 0 ? null : getInt(entityId);
            // wpeErrorLog.subscriptionId = getInt(subscriptionId) === 0 ? null : getInt(subscriptionId);
            // wpeErrorLog.itemId = getInt(itemId) === 0 ? null : getInt(itemId);

            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_message', logMessage.substr(0, 300));
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_location', location || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_level', level || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_exec_context', executionContext || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_call_stack', callStack || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_data', data || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_request', request || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_response', response || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_contact', contactId || '');

            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_send_notificati', parseBool(sendNotification));
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_script', scriptId || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_resolved_by', resolvedById || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_resolution', resolution || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_email_list', emailList || '');
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_slack_channels', slackChannelsList || '');
            wpeErrorLogRecord.setValue(
                'custrecord_wpe_error_log_time',
                new Date(format.format({ value: new Date(), type: format.Type.DATETIMETZ }))
            );
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_link', link);
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_record_type', recordType);
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_record_id', recordId === 0 ? null : recordId);
            wpeErrorLogRecord.setValue(
                'custrecord_wpe_error_log_transaction_id',
                transactionId === 0 ? null : transactionId
            );
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_entity_id', entityId === 0 ? null : entityId);
            wpeErrorLogRecord.setValue(
                'custrecord_wpe_error_log_subscription_id',
                subscriptionId === 0 ? null : subscriptionId
            );
            wpeErrorLogRecord.setValue('custrecord_wpe_error_log_item_id', itemId === 0 ? null : itemId);
            let wpeErrorLogRecordId = wpeErrorLogRecord.save();
            //log.debug('wpeErrorLogId', `customrecord_wpe_error_log:${wpeErrorLogRecordId}`);
            //log.debug('slackChannelsList', `slackChannelsList:${slackChannelsList}`);
            //log.debug('Array.isArray(slackChannelsList)', `Array.isArray(slackChannelsList):${Array.isArray(slackChannelsList)}`);
            if (Array.isArray(slackChannelsList) || !isNullOrWhitespace(slackChannelsList)) {
                sendSlackMessage(slackChannelsList, logMessage);
                log.debug('slack sent');
            }
            if (!isNullOrWhitespace(emailList) && sendNotification && emailAuthorId > 0) {
                email.send({
                    author: emailAuthorId, //2863,
                    body: logMessage,
                    recipients: emailList, //'blake@robinstonetech.com'
                    subject: 'subject',
                    attachments: null,
                    bcc: null,
                    cc: null,
                    isInternalOnly: false,
                    relatedRecords: null,
                    replyTo: null
                });
            }
            if (parseBool(logExecutionMessage)) {
                switch (logLevel) {
                    case 'audit':
                        log.audit('wpeErrorLogMessage', logMessage);
                        break;

                    case 'error':
                        log.error('wpeErrorLogMessage', logMessage);
                        break;

                    case 'emergency':
                        log.emergency('wpeErrorLogMessage', logMessage);
                        break;

                    case 'exception':
                        log.error('wpeErrorLogMessage', logMessage);
                        break;

                    default:
                        log.debug({ title: 'wpeErrorLogMessage', details: logMessage });
                        break;
                }
            }
        } catch (error) {
            try {
                log.error({ title: 'error creating WPE Error Log', details: error + ' ' + error.stack });
            } catch (error) {
                log.error({ title: 'error creating WPE Error Log - Catch', details: error });
            }
        }
    }

    /**
     * Returns a string parsed from an object.  If the value is not a string an empty string is returned.
     * @param {object} value - object to parse
     */
    function parse(value) {
        if (value === undefined || value === null || value === 'null' || isObject(value)) {
            return '';
        }
        return '' + value;
    }

    /**
     * Determind if a string starts with a sub string
     * @param {string} stringToSearch - string to search
     * @param {string} stringToFind - string to find
     * @returns {bool} returns true if the stringToSearch starts with stringToFind
     */
    function startsWith(stringToSearch, stringToFind) {
        if (
            stringToSearch === undefined ||
            stringToSearch === null ||
            stringToFind === undefined ||
            stringToFind === null
        ) {
            return false;
        } else {
            return stringToSearch.lastIndexOf(stringToFind, 0) === 0;
        }
    }
    /**
     * Determind if a string ends with a sub string
     * @param {string} stringToSearch - string to search
     * @param {string} stringToFind - string to find
     * @returns {bool} returns true if the stringToSearch ends with stringToFind
     */
    function endsWith(stringToSearch, stringToFind) {
        if (
            stringToSearch === undefined ||
            stringToSearch === null ||
            stringToFind === undefined ||
            stringToFind === null
        ) {
            return false;
        } else {
            return stringToSearch.indexOf(stringToFind, stringToSearch.length - stringToFind.length) !== -1;
        }
    }

    /**
     * Search a string for a sub string
     * @param {string} stringToSearch - string to search
     * @param {string} stringToFind - string to find
     * @returns {bool} returns true if the stringToFind is contained in the stringToSearch
     */
    function contains(stringToSearch, stringToFind) {
        if (
            stringToSearch === undefined ||
            stringToSearch === null ||
            stringToFind === undefined ||
            stringToFind === null
        ) {
            return false;
        } else {
            return stringToSearch.indexOf(stringToFind, 0) !== -1;
        }
    }

    /**
     * Safe parse of a string to a bool
     * @param {string} str - string to convert to a bool
     */
    function parseBool(str) {
        if (str) {
            if (typeof str === typeof true) {
                return str;
            }
            switch (str.toLowerCase().trim()) {
                case 'true':
                case 'yes':
                case '1':
                case 't':
                    return true;
                case 'false':
                case 'no':
                case '0':
                case 'f':
                case null:
                    return false;
                default:
                    return Boolean(str);
            }
        }
        return false;
    }

    /**
     * Save check to if the parameter is of type object
     * @param {*} obj - parameter to check
     * @returns {bool} - true if the object is of type object
     */
    function isObject(obj) {
        return obj === Object(obj);
    }

    /**
     * Save check to see if an object has properties
     * @param {object} obj - object to check for properties
     * @returns {bool} - true if the object has properties
     */
    function isEmpty(obj) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Save check to see if a string is a valid numberic digit
     * @param {string} char - string to check for a valid numberic digit
     * @returns {bool} - true if n is a valid numberic digit
     */
    function isDigit(char) {
        return char >= '0' && char <= '9';
    }

    /**
     * Save check to see if a string is a valid character
     * @param {string} ch - string to check for a valid character
     * @returns {bool} - true if n is a valid character
     */
    function isCharacter(ch) {
        return typeof ch === 'string' && ch.length === 1 && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'));
    }

    /**
     * returns the string between two strings
     * @param {string} str - string to search
     * @param {string} startString - starting delimiter
     * @param {string} endString - ending delimiter (if null, undefined, or '' the string after the first occurance startString is returned)
     * @returns {string} - string exclusive of the start and end delimiters
     */
    function between(str, startString, endString) {
        if (!isNullOrWhitespace(str)) {
            let beginAt = str.indexOf(startString);
            if (beginAt >= 0) {
                beginAt += startString.length;
                let endAt = -1;
                if (!isNullOrWhitespace(endString)) {
                    endAt = str.indexOf(endString, beginAt + 1);
                }
                if (beginAt >= 0 && endAt > 0 && endAt > beginAt) {
                    return str.substr(beginAt, endAt - beginAt);
                } else if (beginAt >= 0 && endAt === -1) {
                    return str.substr(beginAt);
                }
            }
        }
        return '';
    }

    /**
     * Save check to see if a string is a valid number
     * @param {string} n - string to check for a valid number
     * @returns {bool} - true if n is a valid number
     */
    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    /**
     * Safe parse of a string to a float
     * @param {string} number - string to convert to a float
     */
    function getFloat(number) {
        return isNaN(parseFloat(number)) ? 0.0 : parseFloat(number);
    }

    /**
     * Save parse of a string to an integer. If the entire string is not a valid integer it will return zero
     * @param {string} number - string to convert to an integer
     */
    function getInt(number) {
        if (number) {
            let tempInt = isNaN(parseInt(number)) ? 0 : parseInt(number);
            if (tempInt.toString().length === number.toString().length) {
                return tempInt;
            }
        }
        return 0;
    }

    /**
     * Rounds a number to the specified number of decimal places
     * @param {number} value - value to round
     * @param {integer} decimals - number of significant decimals
     */
    function round(value, decimals) {
        if (typeof decimals === 'undefined' || +decimals === 0) {
            return Math.round(value);
        }
        let calcValue = +value;
        let calcDecimals = +decimals;
        if (isNaN(calcValue) || !(typeof calcDecimals === 'number' && calcDecimals % 1 === 0)) {
            return NaN;
        }
        // Shift
        calcValue = calcValue.toString().split('e');
        calcValue = Math.round(+(calcValue[0] + 'e' + (calcValue[1] ? +calcValue[1] + calcDecimals : calcDecimals)));
        // Shift back
        calcValue = calcValue.toString().split('e');
        return +(calcValue[0] + 'e' + (calcValue[1] ? +calcValue[1] - calcDecimals : -calcDecimals));
    }

    /**
     *
     * @param {string} orginalString - string that will be appended
     * @param {string} stringToAppend - string to append to originalString
     * @param {string} lineDelimiter - delimiter to be placed between originalString and stringToAppend (defaults to \n)
     */
    function append(orginalString, stringToAppend, lineDelimiter) {
        //log.audit('append parameters', 'orginalString = ' + orginalString + '  ' + 'stringToAppend = ' + stringToAppend + '  ' +  'lineDelimiter = ' + lineDelimiter );
        let delimiter = lineDelimiter;
        if (isNullOrWhitespace(orginalString)) {
            return stringToAppend;
        } else {
            if (isNullOrWhitespace(delimiter)) {
                delimiter = '\n';
            }
            return orginalString + delimiter + stringToAppend;
        }
    }

    /** Get a nested property from an object without returning any errors.
     * If the property or property chain doesn't exist, undefined is returned.
     * Property names with spaces may use either dot or bracket "[]" notation.
     * Note that bracketed property names without surrounding quotes will fail the lookup.
     *      e.g. embedded variables are not supported.
     * @param {object} obj The object to check
     * @param {string} property The property or property chain to get (e.g. obj.prop1.prop1a or obj['prop1'].prop2)
     * @returns {*|undefined} The value of the objects property or undefined if the property doesn't exist
     *
     * reference: https://it.knightnet.org.uk/kb/node-js/get-properties/
     */
    function getProperty(obj, property) {
        if (typeof obj !== 'object') {
            throw new Error('getProperty: obj is not an object');
        }
        if (typeof property !== 'string') {
            throw new Error('getProperty: property is not a string');
        }

        // Replace [] notation with dot notation
        let propertyValue = property.replace(/\[["'`](.*)["'`]\]/g, '.$1');

        return propertyValue.split('.').reduce(function (prev, curr) {
            return prev ? prev[curr] : undefined;
        }, obj || '');
    }

    function getSubscriptionTotalFromSubscriptionId(subscriptionIdIn) {
        let subscriptionId = getInt(subscriptionIdIn);

        if (subscriptionId > 0) {
            let subscriptionRecord = record.load({
                type: 'subscription',
                id: subscriptionId,
                isDynamic: false
            });

            if (subscriptionRecord && subscriptionRecord.id) {
                log.debug('subscriptionRecord', subscriptionRecord);
                let priceBook = subscriptionRecord.getValue({ fieldId: 'pricebook' });
                log.debug('priceBook', priceBook);

                if (priceBook) {
                    return getSubscriptionoTotalFromPriceBook(priceBook);
                }
            }
        }
        return 0;
    }

    function getSubscriptionoTotalFromPriceBook(priceBook) {
        let newCost = [];
        let htmlString;
        let stringer;
        let stringer1;
        let stringer2;
        let floatValue;
        let sum = 0;
        search
            .create({
                type: 'pricebook',
                filters: [
                    ['internalid', 'anyof', priceBook],
                    'AND',
                    ['type', 'is', 'Recurring'],
                    'AND',
                    ['formulatext: {isrequired}', 'startswith', 't']
                ],
                columns: [search.createColumn({ name: 'price', label: 'Price' })]
            })
            .run()
            .each(function (result) {
                htmlString = result.getValue({ name: 'price' });
                stringer = htmlString.replace(/(<([^>]+)>)/gi, '');
                stringer1 = stringer.replace('Above&nbsp0:$', '');
                stringer1 = stringer1.replace('Above&nbsp0:£', '');
                stringer1 = stringer1.replace('Above&nbsp0:€', '');
                stringer2 = stringer1.replace(',', '');
                floatValue = getFloat(stringer2);
                newCost.push(floatValue);

                return true;
            });

        sum = newCost.reduce(function (a, b) {
            return a + b;
        }, 0);
        log.debug('sum', sum);
        if (isNumeric(sum)) {
            // always return a whole dollar amount
            sum = round(sum);
        }
        return sum;
    }

    function getCategoryPaymentMethods(categoryIdIn) {
        let categoryId = getInt(categoryIdIn);

        if (categoryId > 0) {
            let paymentMethods = [];
            let paymentMethod = '';
            search
                .create({
                    type: 'customrecord_wpe_cust_cat_payment_method',
                    filters: [['custrecord_wpe_category', 'anyof', categoryId]],
                    columns: [
                        search.createColumn({ name: 'custrecord_wpe_payment_methods', label: 'Payment Methods' }),
                        search.createColumn({ name: 'internalid', label: 'Internal Id' })
                    ]
                })
                .run()
                .each(function (result) {
                    paymentMethod = result.getValue({ name: 'custrecord_wpe_payment_methods' });
                    //let internalId = result.getValue({ name: 'internalid' });
                    log.debug({ title: 'paymentMethod', details: JSON.stringify(paymentMethod) });
                    for (let i = 0; i < paymentMethod.length; i++) {
                        // TODO: how could this be more than one value
                        if (parse(paymentMethod[i]) !== ',') {
                            paymentMethods.push(paymentMethod[i]);
                        }
                    }

                    return true;
                });

            return paymentMethods;
        }
        return 0;
    }

    function deleteCategoryExtentionRec(paymentMethods, categoryIdIn) {
        try {
            let categoryId = getInt(categoryIdIn);

            if (categoryId > 0) {
                log.debug({ title: 'paymentMethods delete ', details: JSON.stringify(paymentMethods) });
                let paymentMethodId = '';
                let internalId = '';
                let paymentMethodCheck = false;
                search
                    .create({
                        type: 'customrecord_wpe_cust_cat_payment_method',
                        filters: [['custrecord_wpe_category', 'anyof', categoryId]],
                        columns: [
                            search.createColumn({ name: 'custrecord_wpe_payment_methods', label: 'Payment Methods' }),
                            search.createColumn({ name: 'internalid', label: 'Internal Id' })
                        ]
                    })
                    .run()
                    .each(function (result) {
                        let paymentMethodIds = result.getValue({ name: 'custrecord_wpe_payment_methods' });
                        log.debug({ title: 'paymentMethod id length ', details: paymentMethodIds });
                        internalId = result.getValue({ name: 'internalid' });
                        log.debug({ title: 'paymentMethod id ', details: paymentMethodId }); // TODO: How could this not be ''
                        paymentMethodCheck = false;
                        if (paymentMethodIds.length > 0) {
                            for (let m = 0; m < paymentMethodIds.length; m++) {
                                if (paymentMethods[m] == paymentMethodId) {
                                    paymentMethodCheck = true;
                                }
                            }

                            if (!paymentMethodCheck) {
                                log.debug({
                                    title: 'paymentMethod to delete',
                                    details: JSON.stringify(paymentMethodId)
                                });
                                record.delete({
                                    type: 'customrecord_wpe_cust_cat_payment_method',
                                    id: internalId
                                });
                            }
                        }
                        return true;
                    });

                return paymentMethods;
            }
        } catch (ex) {
            log.error('Error deleting category payment method extention', ex);
        }
        return 0;
    }

    function createCategoryExtentionRec(custCatField, categoryId, custCatName) {
        try {
            if (categoryId) {
                let extentionRec = record.create({
                    type: 'customrecord_wpe_cust_cat_payment_method',
                    isDynamic: false
                });

                extentionRec.setValue('custrecord_wpe_payment_methods', custCatField);
                extentionRec.setValue('name', custCatName);
                extentionRec.setValue('custrecord_wpe_category', categoryId);

                let savedExtentionRec = extentionRec.save();
                log.debug('savedExtentionRec', savedExtentionRec);
            }
        } catch (ex) {
            log.error('error creating category extention rec', ex);
        }
    }

    function updateCategoryExtentionRec(extRecId, custCatFieldVals) {
        try {
            log.debug('extRecId', extRecId);
            let extentionRec = record.load({
                type: 'customrecord_wpe_cust_cat_payment_method',
                id: extRecId,
                isDynamic: false
            });

            extentionRec.setValue('custrecord_wpe_payment_methods', custCatFieldVals);

            let savedExtentionRec = extentionRec.save();
            log.debug('savedExtentionRec', savedExtentionRec);
        } catch (ex) {
            log.error('error creating category extention rec', ex);
        }
    }

    function convertToAnnualTotal(frequency, total) {
        try {
            let lowercaseFrequency = frequency.toLowerCase();

            let totalString = total.toString().replace('$', '');

            let totalValue = getFloat(totalString);
            if (lowercaseFrequency === 'monthly') {
                //console.log('total ' + total.replace('$', ''))
                totalValue = totalValue * 12;
            }

            if (lowercaseFrequency === 'weekly') {
                totalValue = totalValue * 52;
            }

            return round(totalValue, 2);
        } catch (ex) {
            wpeErrorLog({
                message: ` error calculating convertToAnnualTotal: ${error.message}`,
                callStack: `${error.stack || ''}`,
                location: 'wpe_restlet_utils-convertToAnnualTotal-Catch',
                level: 'exception'
            });
        }
    }

    function addDays(date, days) {
        let result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function addHours(date, hours) {
        let result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
    }

    function addMinutes(date, minutes) {
        let result = new Date(date);
        result.setHours(result.getMinutes() + minutes);
        return result;
    }

    function getFilesFromFileCabinet(folderId) {
        let files = [];
        if (folderId) {
            let fileSearchObj = search.create({
                type: 'file',
                filters: [['folder', 'anyof', folderId]],
                columns: [
                    search.createColumn({ name: 'name', sort: search.Sort.ASC, label: 'Name' }),
                    search.createColumn({ name: 'folder', label: 'Folder' }),
                    search.createColumn({ name: 'documentsize', label: 'Size (KB)' }),
                    search.createColumn({ name: 'url', label: 'URL' }),
                    search.createColumn({ name: 'created', label: 'Date Created' }),
                    search.createColumn({ name: 'modified', label: 'Last Modified' }),
                    search.createColumn({ name: 'filetype', label: 'Type' }),
                    search.createColumn({ name: 'isavailable' }),
                    search.createColumn({ name: 'availablewithoutlogin' }),
                    search.createColumn({ name: 'description' }),
                    search.createColumn({ name: 'hostedpath' }),
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'owner' })
                ]
            });
            //var searchResultCount = fileSearchObj.runPaged().count;
            //log.debug("fileSearchObj result count",searchResultCount);
            let fileObj = null;
            let fileFolderId = null;
            fileSearchObj.run().each(function (result) {
                fileFolderId = parse(result.getValue({ name: 'folder' }));
                if (fileFolderId === folderId) {
                    log.debug('result', JSON.stringify(result));
                    fileObj = {};
                    fileObj.name = parse(result.getValue({ name: 'name' })); //,                  join: "file"}));
                    fileObj.isavailable = parse(result.getValue({ name: 'isavailable' })); //,           join: "file"}));
                    fileObj.availablewithoutlogin = parse(result.getValue({ name: 'availablewithoutlogin' })); //, join: "file"}));
                    fileObj.created = parse(result.getValue({ name: 'created' })); //,               join: "file"}));
                    fileObj.description = parse(result.getValue({ name: 'description' })); //,           join: "file"}));
                    fileObj.folder = parse(result.getValue({ name: 'folder' })); //,                join: "file"}));
                    fileObj.hostedpath = parse(result.getValue({ name: 'hostedpath' })); //,            join: "file"}));
                    fileObj.internalid = parse(result.getValue({ name: 'internalid' })); //,            join: "file"}));
                    fileObj.owner = parse(result.getValue({ name: 'owner' })); //,                 join: "file"}));
                    fileObj.documentsize = parse(result.getValue({ name: 'documentsize' })); //,          join: "file"}));
                    fileObj.filetype = parse(result.getValue({ name: 'filetype' })); //,              join: "file"}));
                    fileObj.url = parse(result.getValue({ name: 'url' })); //,                   join: "file"}));
                    files.push(fileObj);
                }
                return true;
            });
        }
        return files;
    }

    function getSubFoldersFromFileCabinet(folderId) {
        let files = [];
        let folderSearchObject = search.create({
            type: 'folder',
            filters: [['parent', 'anyof', folderId]],
            columns: ['name', 'interalid']
        });
        let fileObj = null;
        folderSearchObject.run().each(function (result) {
            log.debug('result', JSON.stringify(result));
            fileObj = {};
            fileObj.name = parse(result.getValue({ name: 'name' }));
            fileObj.internalid = parse(result.getValue({ name: 'internalid' }));
            files.push(fileObj);
            return false;
        });
        return files;
    }

    function getSubFolderByName(folderId, folderName) {
        let foldersearch = getSubFoldersFromFileCabinet(folderId);
        if (foldersearch) {
            for (let i = 0; i < foldersearch.length; i++) {
                if (parse(foldersearch[i].getValue('name')) === folderName) {
                    return foldersearch[i].id;
                }
            }
        }
        return null;
    }

    function updateSubscriptionMrr(subscriptionMRRdetails) {
        log.debug('subscriptionMRRdetails', subscriptionMRRdetails);
        let loadRecordPromise = record.load.promise({
            type: record.Type.SUBSCRIPTION,
            id: subscriptionMRRdetails.subscription
        });

        loadRecordPromise
            .then(
                function (objRecord) {
                    let isProject = objRecord.getValue({
                        fieldId: 'custrecord_wpe_project'
                    });
                    let mrrOld = objRecord.getValue({ fieldId: 'custrecord_wpe_subscription_mrr' });
                    // let pricebook = objRecord.getText({
                    //     fieldId: 'pricebook'
                    // });
                    if (subscriptionMRRdetails.planChargeFrequency === 'ANNUALLY') {
                        subscriptionMRRdetails.total = subscriptionMRRdetails.total / 12;
                        for (let i = 0; i < subscriptionMRRdetails.allLines.length; i++) {
                            subscriptionMRRdetails.allLines[i].recurringamount =
                                subscriptionMRRdetails.allLines[i].recurringamount / 12;
                        }
                    }

                    if (isProject) {
                        objRecord.setValue({
                            fieldId: 'custrecord_wpe_subscription_project_mrr',
                            value: subscriptionMRRdetails.total
                        });
                    } else {
                        objRecord.setValue({
                            fieldId: 'custrecord_wpe_subscription_mrr',
                            value: subscriptionMRRdetails.total
                        });
                    }

                    let recordId = objRecord.save();
                    if (!isNullOrWhitespace(recordId)) {
                        getMRRAuditLogValues(objRecord, mrrOld, subscriptionMRRdetails.total);
                    }
                    log.debug({
                        title: 'Record updated',
                        details: 'Updated Sub Record ID: ' + recordId
                    });
                },
                function (e) {
                    log.error({
                        title: 'Unable to load record',
                        details: e.name
                    });
                }
            )
            .then(function (response) {
                updateSubscriptionLineMrr(subscriptionMRRdetails);
            });
    }

    function updateSubscriptionLineMrr(subscriptionMRRdetails) {
        for (let i = 0; i < subscriptionMRRdetails.allLines.length; i++) {
            let element = subscriptionMRRdetails.allLines[i];

            let loadRecordPromise = record.load.promise({
                type: record.Type.SUBSCRIPTION_LINE,
                id: element.subscriptionline
            });

            loadRecordPromise.then(
                function (objRecord) {
                    let allLines = subscriptionMRRdetails.allLines;
                    let mmrLineAmount;

                    for (let j = 0; j < allLines.length; j++) {
                        let singleLine = allLines[j];
                        if (singleLine.subscriptionline === objRecord.id) {
                            mmrLineAmount = singleLine.recurringamount;
                        }
                    }

                    objRecord.setValue({
                        fieldId: 'custrecord_wpe_subscription_line_mrr',
                        value: mmrLineAmount
                    });

                    let recordId = objRecord.save();

                    log.debug({
                        title: 'Record updated',
                        details: 'Updated Sub Line record ID: ' + recordId
                    });
                },
                function (e) {
                    log.error({
                        title: 'Unable to load record',
                        details: e.name
                    });
                }
            );
        }
    }

    function updateSubscriptionMRRFields(subscriptionChangeRecord) {
        let subscriptionMRRdetails = {
            subscription: '',
            total: '',
            allLines: '',
            planChargeFrequency: ''
        };

        let allLines = [];
        let line = {};
        let total = 0;

        let newRecord = subscriptionChangeRecord;
        let action = newRecord.getValue({ fieldId: 'action' });

        let newStatus = newRecord.getValue({ fieldId: 'subscriptionchangeorderstatus' });
        let subscription = getInt(newRecord.getValue({ fieldId: 'subscription' }));
        let lineCount = getInt(newRecord.getLineCount({ sublistId: 'subline' }));

        if (subscription > 0) {
            let subscriptionRecord = record.load({
                type: 'subscription',
                id: subscription,
                isDynamic: true
            });
            let initialTerm = subscriptionRecord.getValue({ fieldId: 'initialterm' });
            if (initialTerm === '2') {
                subscriptionMRRdetails.planChargeFrequency = 'ANNUALLY';
            }
        }

        if (newStatus === 'ACTIVE' && lineCount > 0) {
            for (let i = 0; i < lineCount; i++) {
                let recurringamount = getFloat(
                    newRecord.getSublistValue({ sublistId: 'subline', fieldId: 'recurringamount', line: i })
                );
                let subscriptionline = getInt(
                    newRecord.getSublistValue({ sublistId: 'subline', fieldId: 'subscriptionline', line: i })
                );
                let statusnew = newRecord.getSublistValue({ sublistId: 'subline', fieldId: 'statusnew', line: i });
                let status = newRecord.getSublistValue({ sublistId: 'subline', fieldId: 'status', line: i });

                if (action === 'MODIFY_PRICING') {
                    let newRecurringAmount = getFloat(
                        newRecord.getSublistValue({ sublistId: 'subline', fieldId: 'recurringamountnew', line: i })
                    );
                    if (newRecurringAmount > 0 && recurringamount !== newRecurringAmount) {
                        recurringamount = newRecurringAmount;
                    }
                }

                if (statusnew === 'ACTIVE' || status === 'ACTIVE') {
                    total += recurringamount;

                    line = {
                        subscriptionline: subscriptionline,
                        recurringamount: recurringamount
                    };
                    allLines.push(line);
                }
            }

            subscriptionMRRdetails.subscription = subscription;
            subscriptionMRRdetails.total = total;
            subscriptionMRRdetails.allLines = allLines;

            updateSubscriptionMrr(subscriptionMRRdetails);
        }
        if (newStatus === 'TERMINATED' && lineCount > 0) {
            for (let i = 0; i < lineCount; i++) {
                let subscriptionline = getInt(
                    newRecord.getSublistValue({ sublistId: 'subline', fieldId: 'subscriptionline', line: i })
                );
                let statusnew = newRecord.getSublistValue({ sublistId: 'subline', fieldId: 'statusnew', line: i });
                if (statusnew === 'TERMINATED') {
                    total += 0;
                    line = {
                        subscriptionline: subscriptionline,
                        recurringamount: 0
                    };
                    allLines.push(line);
                }
            }
            subscriptionMRRdetails.subscription = subscription;
            subscriptionMRRdetails.total = total;
            subscriptionMRRdetails.allLines = allLines;
            updateSubscriptionMrr(subscriptionMRRdetails);
        }
    }

    /**
     * copyFile - makes a copy of the file and puts it in the destionation folder
     * @param {int} fileId - Internal Id of the file to copy
     * @param {*} destinationFolderId - Internal Id of the destination folder
     * @returns {file} - returns the new file
     */
    function copyFile(fileId, destinationFolderId) { //RENAME_TO_UNIQUE
        return file.copy({ id: fileId, folder: destinationFolderId, conflictResolution: file.NameConflictResolution.RENAME_TO_UNIQUE });
    }

    /**
     * moveFile - moves the file to the destionation folder
     * @param {int} fileId - Internal Id of the file to move
     * @param {*} destinationFolderId - Internal Id of the destination folder
     * @returns {boolean} - returns true if the move was successful
     */
    function moveFile(fileId, destinationFolderId) {
        let success = false;
        try {
            if (fileId && isNumeric(fileId) && destinationFolderId && isNumeric(destinationFolderId)) {
                wpeLog({ message: 'file load' });

                let fileObj = file.load({ id: fileId });
                wpeLog({ message: 'Set Folder Id' });

                fileObj.folder = destinationFolderId;
                wpeLog({ message: 'saving' });

                let newFileId = fileObj.save();
                wpeLog({ message: 'newFileId = ' + newFileId });

                success = true;
            }
        } catch (error) {
            log.error({ title: 'error', details: error });
            wpeLog({ message: 'error = ' + error });
        }
        return success;
    }

    function addZeros(num, len) {
        let str = num.toString();
        while (str.length < len) {
            str = '0' + str;
        }
        return str;
    }

    function convertObjToCSV(arr) {
        if (arr.length === 0) {
            return '';
        }
        let csv = '';
        let columns = Object.keys(arr[0]);
        csv += '"' + columns.join('","') + '"\n';
        csv +=
            '"' +
            arr
                .map(function (row) {
                    return columns
                        .map(function (c) {
                            return (row[c] || '')
                                .toString()
                                .replace(/\n/g, '\\n')
                                .replace(/[\r\n]/g, '')
                                .replace(/"/g, '""');
                        })
                        .join('","');
                })
                .join('"\n"') +
            '"';
        return csv + '\n';
    }

    function makeAnchor(id, type, text) {
        if (!isNullOrWhitespace(type) && !isNullOrWhitespace(id) && !isNullOrWhitespace(text)) {
            let result = '<a href="' + makeLink(id, type) + '">' + text + '</a>';
            return result;
        }
        return null;
    }

    function createGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = (Math.random() * 16) | 0,
                v = parse(c) === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    function makeLink(id, type) {
        if (!isNullOrWhitespace(type) && !isNullOrWhitespace(id)) {
            //url.resolveDomain({hostType: url.HostType.APPLICATION}) +
            return url.resolveRecord({
                isEditMode: false,
                recordId: id,
                recordType: type
            });
        }
        return null;
    }

    /**
     * strCompare
     * @param {string} string1          First string to compare
     * @param {string} string2          Second string to compare
     * @param {bool}   ignoreWhitespace If true, all leading and trailing whitespace is ignored.  ie. 'abc' = '  abc  '
     * @returns
     */
    function strCompare(string1, string2, ignoreWhitespace = false) {
        if (ignoreWhitespace) {
            return parse(string1).trim.toUpperCase() === parse(string2).trim.toUpperCase();
        } else {
            return parse(string1).toUpperCase() === parse(string2).toUpperCase();
        }
    }

    /**
     *  validateEntitlementMessage
     * @param {object} entitlementMessage - message to validate
     * @param  {int}                     .customer_id
     * @param  {int}                     .billingSystemId
     * @param  {int}                     .subscription_id
     * @param  {string}                  .meta_data
     * @param  {bool}                    .to_be_replaced  // must be true or false
     * @param  {int?}                    .replaced_by     // must me int or null
     * @param  {int?}                    .replaces        // must me int or null
     */
    function validateEntitlementMessage(entitlementMessage) {
        let wpeErrorLogContext = 'wpe_restlet_utils-validateEntitlementMessage';
        let errorMessages = [];
        try {
            if (entitlementMessage) {
                if (getInt(entitlementMessage.customer_id) <= 0) {
                    errorMessages.push(`customer_id is invalid.  Value is ${entitlementMessage.customer_id}`);
                }
                //if (entitlementMessage.billingSystemId === undefined || entitlementMessage.billingSystemId[0] !== 'C') {
                //    errorMessages.push(`billingSystemId is invalid.  Value is ${entitlementMessage.billingSystemId}`);
                //}
                if (getInt(entitlementMessage.subscription_id) <= 0) {
                    errorMessages.push(`subscription_id is invalid.  Value is ${entitlementMessage.subscription_id}`);
                }
                if (entitlementMessage.to_be_replaced === undefined || entitlementMessage.to_be_replaced === null) {
                    errorMessages.push(`to_be_replaced is missing.`);
                } else if (typeof entitlementMessage.to_be_replaced !== 'boolean') {

                    errorMessages.push(`to_be_replaced is not Boolean.`);
                }
                if (entitlementMessage.hasOwnProperty('replaced_by')) {
                    if (entitlementMessage.replaced_by !== null) {
                        if (getInt(entitlementMessage.replaced_by) <= 0) {
                            errorMessages.push(
                                `replaced_by is invalid.  Value is ${entitlementMessage.replaced_by} (${typeof entitlementMessage.replaces})`
                            );
                        }
                    }
                }
                if (entitlementMessage.hasOwnProperty('replaces')) {
                    if (entitlementMessage.replaces !== null) {
                        if (getInt(entitlementMessage.replaces) <= 0) {
                            errorMessages.push(
                                `replaces is invalid.  Value is ${entitlementMessage.replaces
                                } (${typeof entitlementMessage.replaces})`
                            );
                        }
                    }
                }
                if (isNullOrWhitespace(entitlementMessage.subscriptionExternalId)) {
                    errorMessages.push(`subscriptionExternalId is missing.`);
                } else if (
                    entitlementMessage.subscriptionExternalId[0] !== 'S' ||
                    getInt(entitlementMessage.subscriptionExternalId.substr(1)) <= 0
                ) {
                    errorMessages.push(`subscriptionExternalId is in the wrong format.`);
                }
            }
        } catch (error) {
            let esmConfig = new EsmConfig();
            let blakesId = esmConfig.employeeIds.BLAKE;
            wpeErrorLog({
                message: ` ${error.message}`,
                callStack: `${error.stack || ''}`,
                location: wpeErrorLogContext + '-Catch',
                level: 'exception',
                emailList: 'blake.versiga@wpengine.com, jason.claxton@wpengine.com, david.papismedov@wpengine.com',
                sendNotification: true,
                emailAuthorId: blakesId
            });
        }
        return errorMessages;
    }

    /**
     *
     * @param {string} csvData - string with lines separated by line breaks.  The first line must be a header with fieldnames with no spaces
     * @returns JSON Array of objects
     */
    function CSVToJSON(csvData) {
        let data = CSVToArray(csvData);
        let objData = [];
        for (let i = 1; i < data.length; i++) {
            objData[i - 1] = {};
            for (let k = 0; k < data[0].length && k < data[i].length; k++) {
                let key = data[0][k];
                objData[i - 1][key] = data[i][k];
            }
        }
        let jsonData = JSON.stringify(objData);
        jsonData = jsonData.replace(/},/g, '},\r\n');
        return jsonData;
    }

    /**
     *
     * @param {string} csvData - string with lines separated by line breaks.  The first line must be a header with fieldnames with no spaces
     * @param {string} delimiter - string that delimits fields in the data line of the csv file.
     * @returns - array of fields
     */
    function CSVToArray(csvData, delimiter) {
        let defaultDelimiter = delimiter || ',';
        let pattern = new RegExp(
            '(\\' +
            defaultDelimiter +
            '|\\r?\\n|\\r|^)' +
            '(?:"([^"]*(?:""[^"]*)*)"|' +
            '([^"\\' +
            defaultDelimiter +
            '\\r\\n]*))',
            'gi'
        );
        let data = [[]];
        let matches = null;
        while ((matches = pattern.exec(csvData))) {
            let matchedDelimiter = matches[1];
            if (matchedDelimiter.length && matchedDelimiter !== defaultDelimiter) {
                data.push([]);
            }
            if (matches[2]) {
                matchedDelimiter = matches[2].replace(new RegExp('""', 'g'), '"');
            } else {
                matchedDelimiter = matches[3];
            }
            data[data.length - 1].push(matchedDelimiter.trim());
        }
        return data;
    }

    /**
     * htmlEncodeString
     * @param {string} string          string to encode
     * @returns
     */
    function htmlEncodeString(string) {
        if (typeof string === 'string') {
            return string
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/'/g, '&#39;')
                .replace(/"/g, '&#34;')
                .replace(/\//, '&#x2F;');
        } else {
            return string;
        }
    }

    /**
     *
     * @param {string} postUrl - url to post
     * @param {string} postPayload - message to send
     * @returns
     */
    function postToSlackChannel(postUrl, postPayload) {
        let header = [];
        header['Content-Type'] = 'application/json';
        //header['Accept'] = 'application/json';
        let payload = `{"text": "${postPayload}"}`;
        let response = https.post({
            header: header,
            url: postUrl,
            body: payload
        });
        let wpeErrorLogRecord = record.create({
            type: 'customrecord_wpe_error_log',
            isDynamic: false
        });
        wpeErrorLogRecord.setValue('custrecord_wpe_error_log_message', `post to Slack returned: ${response.body}`);
        wpeErrorLogRecord.setValue('custrecord_wpe_error_log_level', 'debug');
        wpeErrorLogRecord.setValue('custrecord_wpe_error_log_location', 'wpe_restlet_utils-sendSlackMessage-post');
        wpeErrorLogRecord.setValue('custrecord_wpe_error_log_response', response || '');
        wpeErrorLogRecord.setValue('custrecord_wpe_error_log_request', payload || '');
        wpeErrorLogRecord.save();
        // wpeErrorLog({
        //     message: `post to Slack returned: ${response.body}`,
        //     location: 'wpe_restlet_utils-sendSlackMessage-post',
        //     request: postPayload,
        //     response: JSON.stringify(response)
        // });
        return response;
    }

    /**
     *
     * @param {string} slackMessage
     * @param {string | array} channels - channels to which the message will be sent
     *                                    {netsuite_devs, netsuite-admins}
     */
    function sendSlackMessage(channels, slackMessage) {
        if (!isNullOrWhitespace(slackMessage)) {
            let config = new EsmConfig();
            let host = config.getHost();
            if (!isNullOrWhitespace(host)) {
                host = host.indexOf('.') > -1 ? host.substr(0, host.indexOf('.')) : host;
            }
            let nsDevEnabled = parseBool(config.SLACK_MESSAGE.ENABLE_NSDEV);
            let netsuiteAdminsEnabled = parseBool(config.SLACK_MESSAGE.ENABLE_NETSUITE_ADMINS);
            const netsuiteDevsURL = 'https://hooks.slack.com/services/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';
            const netsuiteAdminsURL = 'https://hooks.slack.com/services/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';
            let response = null;
            try {
                if (channels.indexOf('netsuite-admins') !== -1 && netsuiteAdminsEnabled) {
                    response = postToSlackChannel(netsuiteAdminsURL, `(${host}) ${slackMessage}`);
                }
                if (channels.indexOf('netsuite_devs') !== -1 && nsDevEnabled) {
                    response = postToSlackChannel(netsuiteDevsURL, `(${host}) ${slackMessage}`);
                }
                return response;
            } catch (error) {
                wpeErrorLog({
                    message: `error while posting to slack: ${error.message}`,
                    location: 'wpe_error_log-sendSlackMessage-catch',
                    level: 'error',
                    logExecutionMessage: true
                });
            }
        }
    }
    /**
     *
     * @param {object} subscriptionNew
     * @param {float} mrrOld
     * @param {float} mrrNew
     */
    function getMRRAuditLogValues(subscriptionNew, mrrOld, mrrNew) {
        let wpeErrorLogContext = 'getMRRAuditLogValues';
        let mrrAuditFields = {
            subscriptionId: '',
            subscriptionStatus: '',
            customerId: '',
            fullName: '',
            subscriptionPlanId: '',
            subscriptionPlanName: '',
            exchangeRate: '',
            subscriptionMrrOld: '',
            subscriptionMrrNew: '',
            subscriptionMrrDelta: '',
            subscriptionMrrOldUSD: '',
            subscriptionMrrNewUSD: '',
            subscriptionMrrDeltaUSD: '',
            frequency: '',
            currencyId: '',
            region: '',
            locationId: '',
            currencyIsUSD: '',
            countryId: '',
            appliedDiscountId: '',
            movementReasonName: '',
            project: ''
        };
        wpeErrorLog({
            message: 'Entering ' + wpeErrorLogContext,
            data: JSON.stringify(subscriptionNew),
            location: wpeErrorLogContext,
            level: 'trace'
        });
        try {
            let esmConfig = new EsmConfig();
            let rate = '';
            let countryData = '';
            let currencyData = '';
            if (mrrNew !== mrrOld) {
                mrrAuditFields.subscriptionId = subscriptionNew.id;
                mrrAuditFields.customerId = getInt(subscriptionNew.getValue({ fieldId: 'customer' }));
                mrrAuditFields.fullName = getCompanyName(mrrAuditFields.customerId);
                mrrAuditFields.subscriptionPlanId = getInt(subscriptionNew.getValue({ fieldId: 'subscriptionplan' }));
                mrrAuditFields.subscriptionPlanName = parse(getSubscriptionPlanName(mrrAuditFields.subscriptionPlanId));
                mrrAuditFields.subscriptionMrrNew = mrrNew;
                mrrAuditFields.subscriptionMrrOld = mrrOld;
                mrrAuditFields.subscriptionMrrDelta =
                    mrrAuditFields.subscriptionMrrNew - getFloat(mrrAuditFields.subscriptionMrrOld);
                mrrAuditFields.frequency = parse(subscriptionNew.getValue({ fieldId: 'frequency' }));
                mrrAuditFields.currencyId = getInt(subscriptionNew.getValue({ fieldId: 'currency' }));
                mrrAuditFields.subscriptionStatus = parse(
                    subscriptionNew.getValue({ fieldId: 'billingsubscriptionstatus' })
                );
                mrrAuditFields.locationId = getInt(subscriptionNew.getValue({ fieldId: 'location' }));
                mrrAuditFields.appliedDiscountId = getAppliedDiscountId(mrrAuditFields.subscriptionId);
                mrrAuditFields.movementReasonName = parse(getMovementReasonName(mrrAuditFields.subscriptionId));
                mrrAuditFields.project = subscriptionNew.getValue({ fieldId: 'custrecord_wpe_project' });
                if (mrrAuditFields.locationId > 0) {
                    let locationSearch = search.lookupFields({
                        type: 'location',
                        id: mrrAuditFields.locationId,
                        columns: 'country'
                    });
                    if (locationSearch.country.length > 0) {
                        mrrAuditFields.countryId = parse(locationSearch.country);
                        countryData = esmConfig.defaults.COUNTRY_INVOICE_DATA.get(parse(mrrAuditFields.countryId));
                        mrrAuditFields.region = countryData.REGION;
                    }
                }
                currencyData = esmConfig.defaults.DEFAULT_CURRENCY_LIST.get(parse(mrrAuditFields.currencyId));
                mrrAuditFields.currencyText = parse(currencyData.ISO_CODE);
                if (mrrAuditFields.currencyText === 'USD') {
                    mrrAuditFields.currencyIsUSD = true;
                    if (!isNullOrWhitespace(mrrAuditFields.subscriptionMrrNew)) {
                        //If MRR New is null we want to make sure it's null and not 0
                        mrrAuditFields.subscriptionMrrNewUSD = mrrAuditFields.subscriptionMrrNew;
                    }
                    if (!isNullOrWhitespace(mrrAuditFields.subscriptionMrrOld)) {
                        //If MRR Old is null we want to make sure it's null and not 0
                        mrrAuditFields.subscriptionMrrOldUSD = mrrAuditFields.subscriptionMrrOld;
                    }
                    mrrAuditFields.subscriptionMrrDeltaUSD = mrrAuditFields.subscriptionMrrDelta;
                    mrrAuditFields.exchangeRate = 1.0;
                } else {
                    rate = currency.exchangeRate({
                        source: mrrAuditFields.currencyId,
                        target: 'USD',
                        date: new Date()
                    });
                    if (!isNullOrWhitespace(mrrAuditFields.subscriptionMrrNew)) {
                        //If MRR New is null we want to make sure it's null and not 0
                        mrrAuditFields.subscriptionMrrNewUSD = mrrAuditFields.subscriptionMrrNew * rate;
                    }
                    if (!isNullOrWhitespace(mrrAuditFields.subscriptionMrrOld)) {
                        //If MRR Old is null we want to make sure it's null and not 0
                        mrrAuditFields.subscriptionMrrOldUSD = mrrAuditFields.subscriptionMrrOld * rate;
                    }
                    mrrAuditFields.subscriptionMrrDeltaUSD =
                        mrrAuditFields.subscriptionMrrNewUSD - mrrAuditFields.subscriptionMrrOldUSD;
                    mrrAuditFields.exchangeRate = rate;
                }
                let mrrAuditLogId = createMrrAuditLog(mrrAuditFields);
                log.debug('mrrAuditLog', mrrAuditLogId);
            }
        } catch (error) {
            wpeErrorLog({
                message: `Error preparing MRR Audit Data: ${error.message}`,
                location: 'wpe_restlet_utils-getMRRFields',
                level: 'Error',
                executionContext: parse(subscriptionNew),
                callstack: error.stack.toString(),
                data: '',
                request: JSON.stringify(error),
                response: JSON.stringify(error.stack)
            });
            throw error;
        }
    }

    /**
     *
     * @param {int}     subscriptionId
       @param {int}     customerId
       @param {string}  fullName
       @param {int}     subscriptionPlanId
       @param {int}     subscriptionMrrOld
       @param {int}     subscriptionMrrNew
       @param {string}  frequency
       @param {int}     currencyId
       @param {string}  currencyText
       @param {int}     locationId
       @param {string}  appliedDiscountId
       @param {boolean} currencyIsUSD
       @param {int}     countryId
       @param {string}  region
       @param {boolean} project
       @param {string}  subscriptionPlanName
       @param {string}  subscriptionStatus
       @returns {int}  Creates an MRR Audit Log record and returns the Internal ID
     */
    function createMrrAuditLog(mrrAuditFields) {
        try {
            let mrrAuditRec = record.create({
                type: 'customrecord_wpe_mrr_audit_log'
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_subscription_id',
                value:
                    mrrAuditFields.subscriptionId !== '' && !isNullOrWhitespace(mrrAuditFields.subscriptionId)
                        ? mrrAuditFields.subscriptionId
                        : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_customer_id',
                value: mrrAuditFields.customerId > 0 ? mrrAuditFields.customerId : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_full_name',
                value: mrrAuditFields.fullName !== '' ? mrrAuditFields.fullName : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_subscription_plan',
                value:
                    mrrAuditFields.subscriptionPlanName !== '' &&
                        !isNullOrWhitespace(mrrAuditFields.subscriptionPlanName)
                        ? mrrAuditFields.subscriptionPlanName
                        : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_recurrence',
                value:
                    mrrAuditFields.frequency !== '' && !isNullOrWhitespace(mrrAuditFields.frequency)
                        ? mrrAuditFields.frequency
                        : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_original_local',
                value: mrrAuditFields.subscriptionMrrOld >= 0 ? mrrAuditFields.subscriptionMrrOld : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_changed_local',
                value: mrrAuditFields.subscriptionMrrNew >= 0 ? mrrAuditFields.subscriptionMrrNew : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_delta_local',
                value: mrrAuditFields.subscriptionMrrDelta !== 0 ? mrrAuditFields.subscriptionMrrDelta : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_original_usd',
                value: mrrAuditFields.subscriptionMrrOldUSD >= 0 ? mrrAuditFields.subscriptionMrrOldUSD : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_changed_usd',
                value: mrrAuditFields.subscriptionMrrNewUSD >= 0 ? mrrAuditFields.subscriptionMrrNewUSD : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_delta_usd',
                value: mrrAuditFields.subscriptionMrrDeltaUSD !== 0 ? mrrAuditFields.subscriptionMrrDeltaUSD : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_currency',
                value:
                    mrrAuditFields.currencyText !== '' && !isNullOrWhitespace(mrrAuditFields.currencyText)
                        ? mrrAuditFields.currencyText
                        : ''
            }); 
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_region',
                value:
                    mrrAuditFields.region !== '' && !isNullOrWhitespace(mrrAuditFields.region)
                        ? mrrAuditFields.region
                        : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_coupon_id',
                value: mrrAuditFields.appliedDiscountId > 0 ? mrrAuditFields.appliedDiscountId : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_country',
                value:
                    mrrAuditFields.countryId !== '' && !isNullOrWhitespace(mrrAuditFields.countryId)
                        ? mrrAuditFields.countryId
                        : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_fx_rate',
                value: mrrAuditFields.exchangeRate > 0 ? mrrAuditFields.exchangeRate : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_movement_type',
                value: !isNullOrWhitespace(mrrAuditFields.movementReasonName) ? mrrAuditFields.movementReasonName : ''
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_project',
                value: mrrAuditFields.project === true ? mrrAuditFields.project : false
            });
            mrrAuditRec.setValue({
                fieldId: 'custrecord_wpe_mrr_subscription_status',
                value: !isNullOrWhitespace(mrrAuditFields.subscriptionStatus) ? mrrAuditFields.subscriptionStatus : ''
            });
            let mrrAuditId = mrrAuditRec.save();
            return mrrAuditId;
        } catch (error) {
            wpeErrorLog({
                message: `Error creating MRR Audit Record: ${error.message}`,
                location: 'restlet_utils-createMRRAuditLog',
                level: 'error',
                executionContext: JSON.stringify(mrrAuditFields),
                callstack: JSON.stringify(error.stack),
                data: '',
                request: JSON.stringify(error),
                response: JSON.stringify(error.stack),
                logExecutionMessage: true
            });
            throw error;
        }
    }
    /**
     *
     * @param {string} subscriptionId
     * @returns {string} Applied Discount Id if there is on associated with the Subcsription Id
     * @returns  {int}  Returns 0 if there is no Applied Discount found
     *
     */
    function getAppliedDiscountId(subscriptionId) {
        let appliedDiscountId = '';
        let appliedDiscountSearchResults = search
            .create({
                type: 'customrecord_wpe_applied_discounts',
                filters: [['custrecord_wpe_subscription', 'anyof', subscriptionId]],
                columns: []
            })
            .run()
            .getRange({
                start: 0,
                end: 1
            });
        let appliedDiscountSearchResultCount = appliedDiscountSearchResults.length;
        if (appliedDiscountSearchResultCount > 0) {
            appliedDiscountId = appliedDiscountSearchResults[0].id;
            return getInt(appliedDiscountId);
        } else {
            return 0;
        }
    }
    /**
     *
     * @param {int} subscriptionId
     * @returns {string} Movement Name   If there is a Subscription Change Order associated with the Subcsription Id
     * @returns {null} Returns null    If there is no Applied Discount found
     *
     */
    function getMovementReasonName(subscriptionId) {
        let movementReasonName = '';
        let changeOrderSearchResults = search
            .create({
                type: 'subscriptionchangeorder',
                filters: [['subscription', 'anyof', subscriptionId]],
                columns: [
                    search.createColumn({
                        name: 'datecreated',
                        sort: search.Sort.DESC,
                        label: 'Date Created'
                    }),
                    search.createColumn({ name: 'custrecord_wpe_change_reason' })
                ]
            })
            .run()
            .getRange({
                start: 0,
                end: 1
            });
        let changeOrderSearchResultsCount = changeOrderSearchResults.length;
        if (changeOrderSearchResultsCount > 0) {
            movementReasonName = changeOrderSearchResults[0].getText({ name: 'custrecord_wpe_change_reason' });
            if (!isNullOrWhitespace(movementReasonName)) {
                return movementReasonName;
            }
        } else {
            return null;
        }
    }
    /**
     * @param {int}} customerId
     * @returns {string} Returns the Entity ID and the company name in one string
     */

    function getCompanyName(customerId) {
        let customerLookupFields = search.lookupFields({
            type: 'customer',
            id: customerId,
            columns: ['entityid', 'companyname']
        });
        return customerLookupFields.entityid + ' ' + customerLookupFields.companyname;
    }
    /**
     * @param {int} subscriptionId
     * @returns {string} Returns the Subscription Plan Name
     */
    function getSubscriptionPlanName(subscriptionId) {
        let subscriptionLookup = search.lookupFields({
            type: 'subscriptionplan',
            id: subscriptionId,
            columns: ['itemid']
        });
        return subscriptionLookup.itemid;
    }

    /**
     * Return true if ARM is active and false otherwise
     * @returns {boolean} Returns true if there are revenue plan records
     */
    function armActive() {
        try {
            let queryResult = query.runSuiteQL({
                query:
                    'SELECT MAX(revRecEndDate) from RevenuePlan'
            }).asMappedResults();
            return !isNullOrWhitespace(queryResult[0].expr1);
        } catch (error) {
            return false;
        }
    }

    return {
        returnError: returnError,
        isNullOrWhitespace: isNullOrWhitespace,
        createSuiteletURL: createSuiteletURL,
        formatMessage: formatMessage,
        showMessage: showMessage,
        getCustomerDefaultDepartmentAndLocation: getCustomerDefaultDepartmentAndLocation,
        getToday: getToday,
        pausecomp: pausecomp,
        getInAdvancedLineCount: getInAdvancedLineCount,
        wpeLog: wpeLog,
        parse: parse,
        startsWith: startsWith,
        endsWith: endsWith,
        contains: contains,
        parseBool: parseBool,
        isObject: isObject,
        isEmpty: isEmpty,
        isDigit: isDigit,
        isCharacter: isCharacter,
        between: between,
        getFloat: getFloat,
        getInt: getInt,
        round: round,
        append: append,
        buildSearch: buildSearch,
        getProperty: getProperty,
        getSubscriptionTotalFromSubscriptionID: getSubscriptionTotalFromSubscriptionId,
        addDays: addDays,
        addHours: addHours,
        addMinutes: addMinutes,
        convertToAnnualTotal: convertToAnnualTotal,
        isNumeric: isNumeric,
        getCategoryPaymentMethods: getCategoryPaymentMethods,
        createCategoryExtentionRec: createCategoryExtentionRec,
        deleteCategoryExtentionRec: deleteCategoryExtentionRec,
        updateCategoryExtentionRec: updateCategoryExtentionRec,
        getFilesFromFileCabinet: getFilesFromFileCabinet,
        getSubFoldersFromFileCabinet: getSubFoldersFromFileCabinet,
        getSubFolderByName: getSubFolderByName,
        runSearch: runSearch,
        updateSubscriptionMRRFields: updateSubscriptionMRRFields,
        copyFile: copyFile,
        moveFile: moveFile,
        addZeros: addZeros,
        convertObjToCSV: convertObjToCSV,
        makeAnchor: makeAnchor,
        makeLink: makeLink,
        createGUID: createGUID,
        strCompare: strCompare,
        validateEntitlementMessage: validateEntitlementMessage,
        CSVToJSON: CSVToJSON,
        CSVToArray: CSVToArray,
        getSubscriptionoTotalFromPriceBook: getSubscriptionoTotalFromPriceBook,
        htmlEncodeString: htmlEncodeString,
        wpeErrorLog: wpeErrorLog,
        post: postToSlackChannel,
        sendSlackMessage: sendSlackMessage,
        createMrrAuditLog: createMrrAuditLog,
        getAppliedDiscountId: getAppliedDiscountId,
        getMovementReasonName: getMovementReasonName,
        getCompanyName: getCompanyName,
        getSubscriptionPlanName: getSubscriptionPlanName,
        armActive: armActive
    };
});
