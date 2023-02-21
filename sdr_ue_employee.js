/**
 *sdr_ue_employee.js
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

define(['N/record'], function(record) {

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
        }
    };
 
    return {
        afterSubmit: afterSubmit
    };
 });