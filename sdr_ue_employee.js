/**
 *sdr_ue_employee.js
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

define(['N/record'], function(record) {
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

        let employee = context.newRecord;
        let empCode = employee.getValue('custentity_sdr_employee_code');
        let supervisorID = employee.getValue('supervisor');
 
        log.debug('Employee Code', empCode);
        log.debug('Supervisor ID', supervisorID);

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

            // Create an event record. Since this also needs to be triggered when we are creating a new record, we'll put that inside the if statement
            let event = record.create ({
                type : record.Type.CALENDAR_EVENT,
                isDynamic  : true
            });

            // Set mandatory 
            event.setValue('title', 'Welcome meeting with supervisor');

            // Select an empty line on my attendees sublist
            event.selectNewLine({sublistId: 'attendee'}); 

            // Set sublist value for employee
            event.setCurrentSublistValue ({
                sublistId : 'attendee',
                fieldId : 'attendee',
                value : employee.id
            });

            // Want user to click the OK or Add button, or virtually do that by using commitLine
            event.commitLine({sublistId : 'attendee'});

            // To add supervisor...

            // Select an empty line on my attendees sublist
            event.selectNewLine({sublistId: 'attendee'});

            // Set sublist value 
            event.setCurrentSublistValue ({
                sublistId : 'attendee',
                fieldId : 'attendee',
                value : employee.getValue('supervisor')
            });
            
            // Want user to click the OK or Add button, or virtually do that by using commitLine
            event.commitLine({sublistId : 'attendee'});

            event.save();
        }
    };
 
    return {
        afterSubmit: afterSubmit
    };
 });