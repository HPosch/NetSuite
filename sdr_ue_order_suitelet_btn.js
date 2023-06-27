/**
 * sdr_ue_order_suitelet_btn.js
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

define(['N/record', 'N/runtime', 'N/redirect'],

function(record, runtime, redirect ) {

    function beforeLoad(context) {
        let order = context.newRecord;
        let form = context.form;

        let stSuiteletLinkParam = runtime.getCurrentScript().getParameter({
            name: 'custscript_suiteletlink'
        });

        let suiteletURL = stSuiteletLinkParam;
        log.debug('call', 'window.open('+ suiteletURL +
        '&sdr_orderNo=' + order.getValue('tranid') +
        '&sdr_custId=' + order.getValue('entity') +
        '&sdr_orderTotal=' + order.getValue('total') +
        '&sdr_financePrice=' + order.getValue('custbody_sdr_financing_price') +
        '&sdr_orderId=' + order.id +
        '", "_self","width=1005,height=667");');

        form.addButton({
            id: 'custpage_suiteletbutton',
            label: 'To Suitelet!',

            functionName: 'window.open("'+ suiteletURL +
            '&sdr_orderNo=' + order.getValue('tranid') +
            '&sdr_custId=' + order.getValue('entity') +
            '&sdr_orderTotal=' + order.getValue('total') +
            '&sdr_financePrice=' + order.getValue('custbody_sdr_financing_price') +
            '&sdr_orderId=' + order.id +
            '", "_self","width=1005,height=667");'

        
        })
    }

    return {
        beforeLoad: beforeLoad
    }
});
