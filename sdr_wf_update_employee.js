/**
 * sdr_wf_update_employee.js
 * @NApiVersion 2.1
 * @NScriptType workflowactionscript
 */
define(['N/record', 'N/runtime'],
/**
 * 
 * @param {record} record 
 * @param {runtime} runtime 
 */

function(record, runtime) {
 
    function onAction(context) {
        let workflowTotal = runtime.getCurrentScript().getParameter({
            name : ''
        });

        let expRep = context.newRecord;
        let expenseCount = expRep.getLineCount({sublistId : 'expense'});
        let employeeId = expRep.getValue('entity');
        let notes = 'Workflow Total : ' + workflowTotal + '\n' +
                    'Expense Count: ' + expenseCount;
        
        let employee = record.load({
            type: record.Type.EMPLOYEE,
            id : employeeID
        });
        employee.setValue('comments', notes);
        employee.save();
    }

    return {
        onAction: onAction
    };
});
