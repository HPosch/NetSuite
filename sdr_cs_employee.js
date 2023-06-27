/**
 *sdr_cs_employee.js
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@ModuleScope Public
 */

'use strict';

define(['N/runtime', 'N/https', 'N/url'],
/**
 * @param {runtime} runtime
 * @param {https} https
 * @param {url} url
 */

function(runtime, https, url) {

    function saveRecord(context) {
        let employee = context.currentRecord;
        let isValid = true;
        
        let empCode = employee.getValue('custentity_sdr_employee_code');

        if (empCode === 'x'){
            alert('Invalid Employee Code value. Please try again.');
            isValid = false;
        }

        // let restletUrl = url.resolveScript({  // using url module. resolveScript method returns URL for the script that you provide script ID and deployment ID
        //     deploymentId: 'customdeploy_sdr_rl_validate_emp_code', // don't want to hardcode the URL
        //     scriptId: 'customscript_sdr_rl_validate_emp_code',
        // })

        // // use https module to request information from RESTlet
        // // get the response from my request operation
        // let response = https.get({  // RESTlet
        //     url : restletUrl + '&sdr_emp_code=' + empCode
        // })

        // // response.body gets contents of response
        // if (response.body === 'invalid') {
        //     alert('Invalid Employee Code value. Please try again'); 
        //     return false; //make sure to return a boolean value. Dissallow user to save
        // }
        return isValid;
    }

    function validateField(context) { // When user moves away from field
        let employee = context.currentRecord;
        let isValid = true;

        if (context.fieldId === 'custentity_sdr_employee_code') {
            let empCode = employee.getValue('custentity_sdr_employee_code');

            if (empCode === 'X') {
                alert('Invalid Employee Code value. Please try again'); 
                isValid = false; 
            }
        }
        return isValid; 
    }

    function fieldChanged(context) {
        let employee = context.currentRecord;

        if (context.fieldId === 'phone'){   //add filter to check which field user is currently manipulating.
            let fax = employee.getValue('fax');

            if (!fax) { //if fax doesn't exist, set fax field to phone number
                let phone = employee.getValue('phone');
                employee.setValue('fax', phone);
            }
        } 
    }

    // function pageInit(context) { 
    //     let employee = context.currentRecord;
    //     let perfRevCount = employee.getLineCount({ // Get count of performance reviews for a particular employee
    //         sublistId : 'recmachcustrecord_sdr_perf_subordinate'
    //     });

    //     let notes = `This employee has ${perfRevCount} performance reviews.\n`;

    //     // Get count of F-Rated reviews
    //     let fRatingCount = 0;  
    //     for (let i=0; i <perfRevCount; i++) {
    //         let ratingCode = employee.getSublistValue({
    //             sublistId : 'recmachcustrecord_sdr_perf_subordinate',
    //             fieldId   : 'custrecord_sdr_perf_rating_code',
    //             line      : i
    //         });

    //         if (ratingCode === 'F') {
    //             fRatingCount += 1;
    //         } 
    //     }

    //     notes += `This employee has ${fRatingCount} F-rated reviews.`;
        
    //     alert(notes);

    //     let empCode = employee.getValue('custentity_sdr_employee_code')

    //     if (!empCode) {
    //         let defaultEmpCode = runtime.getCurrentScript().getParameter({
    //             name : 'custscript_sdr_default_emp_code'
    //         });

    //         employee.setValue('custentity_sdr_employee_code', defaultEmpCode);
    //     }
    // }

    /**
    * Line Init
    * Defines the function that is executed when an existing line is selected.
    * This event can behave like a pageInit event for line items in an inline editor sublist or editor sublist.
    * @param {object} scriptContext
    * @param {record.Record}	.currentRecord
    * @param {string}			.scriptContext.sublistId	The sublist ID name.
    */

    // function lineInit(context) { // Set default of Review Type for new performance reviews to Salary Change
    //     let employee = context.currentRecord; // Reference to the record that the user is currently manipulating

    //     if (context.sublistId === 'recmachcustrecord_sdr_perf_subordinate') { // If user is manipulating the Performance Review sublist

    //         let reviewType = employee.getCurrentSublistValue({
    //             sublistId : 'recmachcustrecord_sdr_perf_subordinate',
    //             fieldId   : 'custrecord_sdr_perf_review_type'
    //         });

    //         if (!reviewType) {
    //             employee.setCurrentSublistValue({
    //                 sublistId : 'recmachcustrecord_sdr_perf_subordinate',
    //                 fieldId   : 'custrecord_sdr_perf_review_type',
    //                 value     : 1 // Value of Salary Change
    //             });
    //         }
    //     }
    // }
    
    /**
    * Validate Line
    * Defines the validation function that is executed before a line is added to an inline editor sublist or editor sublist.
    * This event can behave like a saveRecord event for line items in an inline editor sublist or editor sublist
    * @param {object} scriptContext
    * @param {record.Record}	.currentRecord
    * @param {string}			.scriptContext.sublistId	The sublist ID name.
    * @returns {bool}	true if the sublist line is valid and the addition is successful. false otherwise.
    */

    // function validateLine(context) { // Salary increase cannot be greater than $5,000
    //     let employee = context.currentRecord;

    //     if (context.sublistId === 'recmachcustrecord_sdr_perf_subordinate') {

    //         let increaseAmount = employee.getCurrentSublistValue({
    //             sublistId : 'recmachcustrecord_sdr_perf_subordinate',
    //             fieldId   : 'custrecord_sdr_perf_sal_incr_amt',
    //         });
            
    //         if (increaseAmount > 5000) {
    //             alert('Salary increase amount cannot be greater than $5,000');
    //             return false;
    //         }
    //     }

    //     return true;
    // }

    return {
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        // pageInit: pageInit,
        // lineInit: lineInit,
        // validateLine: validateLine
    }
});


