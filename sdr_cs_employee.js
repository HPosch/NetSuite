/**
 *sdr_cs_employee.js
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */

define(['N/runtime', 'N/https', 'N/url'],
/**
 * @param {runtime} runtime
 * @param {https} https
 * @param {url} url
 */

function(runtime, https, url) {

    function saveRecord(context) {
        let employee = context.currentRecord;
        
        let empCode = employee.getValue('custentity_sdr_employee_code'); // validate employee code value

        let restletUrl = url.resolveScript({  // using url module. Grabs URL for your script if you provide script ID and deployment ID
            deploymentId: 'customdeploy_sdr_rl_validate_emp_code',
            scriptId: 'customscript_sdr_rl_validate_emp_code',
        })

        let response = https.get({  // RESTlet
            url : restletUrl + '&sdr_emp_code=' + empCode
        })

        if (response.body === 'invalid') {
            alert('Invalid Employee Code value. Please try again'); 
            return false; //make sure to return a boolean value. Dissallow user to save
        }
        return true; //allow user to save value
    }

    function validateField(context) { // When user moves away from field
        let employee = context.currentRecord;

        if (context.fieldId === 'custentity_sdr_employee_code') {
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

    function pageInit(context) {
        let employee = context.currentRecord;

        // Get count of performance reviews
        let perfRevCount = employee.getLineCount({
            sublistId : 'recmachcustrecord_sdr_perf_subordinate'
        });

        let notes = 'This employee has ' + perfRevCount + ' performance reviews.\n';

        // Get count of F-Rated reviews
        let fRatingCount = 0;
        for (let i=0; i <perfRevCount; i++) {
            let ratingCode = employee.getSublistValue({
                sublistId : 'recmachcustrecord_sdr_perf_subordinate',
                fieldId   : 'custrecord_sdr_perf_rating_code',
                line      : i
            });

            if (ratingCode === 'F') {
                fRatingCount += 1;
            } 
        }

        notes += 'This employee has ' + fRatingCount + ' F-rated reviews.';
        // alert(notes);

        let empCode = employee.getValue('custentity_sdr_employee_code')

        if (!empCode) {
            let defaultEmpCode = runtime.getCurrentScript().getParameter({
                name : 'custscript_sdr_default_emp_code'
            });

            employee.setValue('custentity_sdr_employee_code', defaultEmpCode);
        }
    }

    function lineInit(context) {
        let employee = context.currentRecord;

        // Set default of Review Type for new performance reviews to Salary Change
        if (context.sublistId === 'recmachcustrecord_sdr_perf_subordinate') {

            let reviewType = employee.getCurrentSublistValue({
                sublistId : 'recmachcustrecord_sdr_perf_subordinate',
                fieldId   : 'custrecord_sdr_perf_review_type'
            });

            if (!reviewType) {
                employee.setCurrentSublistValue({
                    sublistId : 'recmachcustrecord_sdr_perf_subordinate',
                    fieldId   : 'custrecord_sdr_perf_review_type',
                    value     : 1 // Value of Salary Change
                });
            }
        }
    }

    function validateLine(context) { 
        let employee = context.currentRecord;

        // Salary increase cannot be greater than $5,000
        if (context.sublistId === 'recmachcustrecord_sdr_perf_subordinate') {

            let increaseAmount = employee.getCurrentSublistValue({
                sublistId : 'recmachcustrecord_sdr_perf_subordinate',
                fieldId   : 'custrecord_sdr_perf_sal_incr_amt',
            });
            
            if (increaseAmount > 5000) {
                alert('Salary increase amount cannot be greater than $5,000');
                return false;
            }
        }

        return true;
    }

    return {
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        pageInit: pageInit,
        lineInit: lineInit,
        validateLine: validateLine
    }
});


