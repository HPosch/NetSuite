/**
 *sdr_ue_employee.js
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */

'use strict';

define(['N/record', 'N/redirect', 'N/ui/serverWidget'], function(record, redirect, serverWidget) {
    /**
    * Before Load
    * @param {object} context
    * @param {serverWidget.Form}		.form
    * @param {record.Record}			.newRecord
    * @param {http.ServerRequest}		.request (optional)
    * @param {context.UserEventType}	.type (APPROVE, CANCEL, CHANGEPASSWORD, COPY, CREATE,
    *                                       DELETE, DROPSHIP, EDIT, EDITFORECAST, EMAIL, MARKCOMPLETE,
    *                                       ORDERITEMS, PACK, PAYBILLS, PRINT, QUICKVIEW, REASSIGN, REJECT,
    *                                       SHIP, SPECIALORDER, TRANSFORM, VIEW, XEDIT)
    */

    // function beforeLoad(context) {

    //     // let employee = context.newRecord;
    //     let form = context.form;
    //     log.debug('In beforeLoad','');

    //     let tab = form.addTab({
    //         id: 'custpage_training_events',
    //         label: 'Training Events'
    //     });

    //     let selectField = form.addField({
    //         id : 'custpage_selectfield',
    //         type : serverWidget.FieldType.SELECT,
    //         label : 'Training Event 1',
    //         container: 'custpage_training_events'
    //     });

    //     selectField.addSelectOption({
    //         value : 'custfield_ns_essentials',
    //         text : 'NetSuite Essentials',
    //     });
        
    //     selectField.addSelectOption({
    //         value : 'custfield_ns_admin_fund',
    //         text : 'NetSuite Administrator Fundamentals'
    //     });
        
    //     selectField.addSelectOption({
    //         value : 'custfield_suitebilling_fund',
    //         text : 'SuiteBilling Fundamentals'
    //     });

    //     selectField.addSelectOption({
    //         value : 'custfield_suitescript',
    //         text : 'SuiteScript 2.0'
    //     });
    // }

/**
* After Submit
* @param {object} context
* @param {object} .newRecord
* @param {object} .oldRecord
* @param {context.UserEventType} .type (APPROVE, CANCEL, CHANGEPASSWORD, COPY, CREATE,
*                                       DELETE, DROPSHIP, EDIT, EDITFORECAST, EMAIL, MARKCOMPLETE,
*                                       ORDERITEMS, PACK, PAYBILLS, PRINT, QUICKVIEW, REASSIGN, REJECT,
*                                       SHIP, SPECIALORDER, TRANSFORM, VIEW, XEDIT)
*/
    function afterSubmit(context) {

        let employee = context.newRecord; // When saving, will get a copy of my employee record
        let empCode = employee.getValue('custentity_sdr_employee_code');
        // let supervisorName = employee.getText('supervisor');
        let supervisorID = employee.getValue('supervisor');

        log.debug('Employee Code', empCode);
        log.debug('Supervisor ID', supervisorID);
        // log.debug('Supervisor Name', supervisorName);

        if (context.type === context.UserEventType.CREATE){ //filter for when user is creating the record
            let phoneCall = record.create({
                type: record.Type.PHONE_CALL,
                defaultValues: {
                    customform: -150
                }
            });

            phoneCall.setValue('title', 'Call HR for benefits');
            phoneCall.setValue('assigned', employee.id);
            phoneCall.save();

        //     // Create an event record. Since this also needs to be triggered when we are creating a new record, we'll put that inside the if statement
        //     let event = record.create ({
        //         type : 'calendarevent',
        //         isDynamic  : true
        //     });

        //     // Set mandatory 
        //     event.setValue('title', 'Welcome meeting with supervisor');

        //     // Select an empty line on my attendees sublist
        //     event.selectNewLine({sublistId: 'attendee'}); 

        //     // Set sublist value for employee
        //     event.setCurrentSublistValue ({
        //         sublistId : 'attendee',
        //         fieldId : 'attendee',
        //         value : employee.id
        //     });

        //     // Want user to click the OK or Add button, or virtually do that by using commitLine
        //     event.commitLine({sublistId : 'attendee'});

        //     // To add supervisor...

        //     // Select an empty line on my attendees sublist
        //     event.selectNewLine({sublistId: 'attendee'});

        //     // Set sublist value 
        //     event.setCurrentSublistValue ({
        //         sublistId : 'attendee',
        //         fieldId : 'attendee',
        //         value : employee.getValue('supervisor')
        //     });
            
        //     // Want user to click the OK or Add button, or virtually do that by using commitLine
        //     event.commitLine({sublistId : 'attendee'});

        //     event.save();
        }

        // redirect.toSuitelet({
        //     scriptId : 'customscript_sdr_sl_update_emp_notes',
        //     deploymentId : 'customdeploy_sdr_sl_update_emp_notes',
        //     parameters : {
        //         sdr_name : employee.getValue('entityid'),
        //         sdr_notes : employee.getValue('comments'),
        //         sdr_empid : employee.id
        //     }
        // });
    };
 
    return {
        afterSubmit: afterSubmit
        // beforeLoad: beforeLoad
    };
 });