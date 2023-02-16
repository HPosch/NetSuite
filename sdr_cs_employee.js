/**
 *sdr_cs_employee.js
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define([], function() {

    function saveRecord(context) {
        let employee = context.currentRecord;
        
        let empCode = employee.getValue('custentity_sdr_employee_code') // validate employee code value
        if (empCode === 'x') {
            alert('Invalid Employee Code value. Please try again'); 
            return false; //make sure to return a boolean value. Dissallow user to save
        }
        return true; //allow user to save value
    }

    function validateField(context) { // When user moves away from field
        let employee = context.currentRecord;

        if (context.fieldID === 'custentity_sdr_employee_code') {
            let empCode = employee.getValue('custentity_sdr_employee_code');

            if (empCode === 'x') {
                alert('Invalid Employee Code value. Please try again'); 
                return false; 
            }
        }
        return true; 
    }

    function fieldChanged(context) {
        let employee = context.currentRecord; //client-side script. Property changes according to function or script type

        //add in filter to check which field user is currently manipulating. If not, the system will try to execute regardless of field being changed.
        if (context.fieldId === 'phone'){ //need to extract field that the customer is currently using from context object
            let fax = employee.getValue('fax') // get value from fax field

            if (!fax) { //if fax doesn't exist, set fax field to phone number
                let phone = employee.getValue('phone');
                employee.setValue('fax', phone);

            }
        } 

    }

    return {
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged
    }
});

