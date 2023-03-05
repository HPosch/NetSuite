/**
 * sdr_sl_update_emp_notes.js
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/redirect'], 
/**
 * @param {serverWidget} serverWidget
 * @param {record} record
 * @param {redirect} redirect
*/

function(serverWidget, record, redirect) {

    /**
    * onRequest
    * @param {object} params
    * @param {http.ServerRequest}	.request
    * @param {http.ServerResponse}	.response
    * @returns void
    */

    function onRequest(context) {

        let request = context.request;
        let response = context.response;

        if(request.method === 'GET') {
            let name = request.parameters.sdr_name;
            let notes = request.parameters.sdr_notes;
            let empid = request.parameters.sdr_empid;

            let form = serverWidget.createForm({
                title : 'Update Employee Notes',
             });

            let nameFld = form.addField({
                id : 'custpage_sdr_emp_name',
                type : serverWidget.FieldType.TEXT,
                label : 'Name'
            });

            let notesFld = form.addField({
                id : 'custpage_sdr_notes',
                type : serverWidget.FieldType.TEXTAREA,
                label : 'Notes'
            });

            let empIdFld = form.addField({
                id : 'custpage_sdr_emp_id',
                type : serverWidget.FieldType.TEXT,
                label : 'Emp ID'
            });

            form.addSubmitButton('Continue');

            nameFld.defaultValue = name;
            notesFld.defaultValue = notes;
            empIdFld.defaultValue = empid;

            nameFld.updateDisplayType({
                displayType : serverWidget.FieldDisplayType.INLINE
            });

            empIdFld.updateDisplayType({
                displayType : serverWidget.FieldDisplayType.HIDDEN
            });

            response.writePage(form);

        } else { // POST
            let empid = request.parameters.custpage_sdr_emp_id;
            let notes = request.parameters.custpage_sdr_notes;

            let employee = record.load({
                type : record.Type.EMPLOYEE,
                id : empid
            });

            employee.setValue('comments', notes);
            employee.save();

            redirect.toRecord({
                type : record.Type.EMPLOYEE,
                id : empid
            });
        }
    }

    return {
        onRequest: onRequest
    };
});
