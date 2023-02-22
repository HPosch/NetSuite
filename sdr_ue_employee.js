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
                    customform: 26
                }
            });

            phoneCall.setValue('title', 'Call HR for benefits');
            phoneCall.setValue('assigned', employee.id);
            phoneCall.setValue('phone', '512-555-6666');
            phoneCall.save();
        }
    };
 
    return {
        afterSubmit: afterSubmit
    };
 });