/**
 *sdr_cs_customer.js
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@ModuleScope Public
 */

 'use strict';

 define(['N/https', 'N/url'],

 /**
 * @param {https} https
 * @param {url} url
 */
 
function(https, url) {

 /**
 * Field Changed
 * Defines the function that is executed when a field is changed by a user or client call.
 * This event may also execute directly through beforeLoad user event scripts.
 * The following sample tasks can be performed:
 * Provide the user with additional information based on user input.
 * Disable or enable fields based on user input.
 * For an example, see SuiteScript Client Script Sample.
 * Note This event does not execute when the field value is changed or entered in the page URL. Use the pageInit function to handle URLs that may contain updated field values. See pageInit(scriptContext).
 * @param {object} context
 *        {record.Record}	.currentRecord
 *        {string}			.context.sublistId	The sublist ID name.
 *        {string}			.context.fieldId		The field ID name.
 *        {string}			.context.line			The line number (zero-based index) if the field is in a sublist or a matrix.
 *        {string}			.context.column		The column number (zero-based index) if the field is in a matrix.  If the field is not in a matrix, the default value is undefined.
 */

    function fieldChanged(context) {
        let customer = context.currentRecord;

        let applyCoupon = customer.getValue('custentity_sdr_apply_coupon');
        let couponCode = customer.getField('custentity_sdr_coupon_code');

        if(context.fieldId === 'custentity_sdr_apply_coupon'){ // if user checks apply coupon field
           console.log('Here');
            if (applyCoupon) { // if value exists in here? (checkbox checked?)
                couponCode.isDisabled = false;
            } else {
                couponCode.isDisabled = true;
            }
        }
    }
/**
*  Defines the function that is executed when a record is saved (after the submit button is pressed but before the form is submitted).
*  The following sample tasks can be performed:
*  Provide alerts before committing the data.
*  Enable fields that were disabled with other functions.
*  Redirect the user to a specified URL.
*
* @param   {Object}	ScriptContext.current - The current form record.
* @param   {string}	The mode in which the record is being accessed. The mode can be set to one of the following values: (copy, create, edit)
* @returns {bool}		true if the record is valid and is saved.  Otherwise the record is not saved.
*/
    function saveRecord(context) {
        let customer = context.currentRecord;

        let isValid = false;
        
        let couponCode = customer.getValue('custentity_sdr_coupon_code'); // validate coupon code value
        // log.debug('Coupon Code', couponCode)

        let restletUrl = url.resolveScript({  // using url module. resolveScript method returns URL for the script that you provide script ID and deployment ID
            deploymentId: 'customdeploy_sdr_rl_validate_coupon_code', // don't want to hardcode the URL
            scriptId: 'customscript_sdr_rl_validate_coupon_code',
        });

        // use https module to request information from RESTlet
        // get the response from my request operation
        let response = https.get({  // RESTlet
            url : restletUrl + '&sdr_couponcode=' + couponCode
        });

        // response.body gets contents of response
        if (response.body === 'invalid') {
            alert('Coupon code is invalid'); 
            isValid = false; //make sure to return a boolean value. Dissallow user to save
        }


        // The total PREFERRED QUANTITY across all product preferences for an individual customer cannot exceed 25.
        let productPreferencesCount = customer.getLineCount({ 
            sublistId : 'recmachcustrecord_sdr_prod_pref_customer'
        });

        let sumOfQuantities = 0;

        for (let i = 0; i < productPreferencesCount; i++ ) {
            lineQuantity = customer.getSublistValue({
               sublistId : 'recmachcustrecord_sdr_prod_pref_customer',
                fieldId : 'custrecord_sdr_prod_pref_qty',
                line: i,
            })

            sumOfQuantities += lineQuantity;

            if (sumOfQuantities > 25) {
                alert('The total preferred quantity across all product preferences has exceeded the limit of 25.')
                isValid = false;
            }
        }

        return isValid; 
    }

    /**
    * Page Init
    *Defines the function that is executed after the page completes loading or when the form is reset.
    * The following sample tasks can be performed:
    * Populate field defaults.
    * Disable or enable fields.
    * Change field availability or values depending on the data available for the record.
    * Add flags to set initial values of fields.
    * Provide alerts where the data being loaded is inconsistent or corrupted.
    * Retrieve user login information and change field availability or values accordingly.
    * Validate that fields required for your custom code (but not necessarily required for the form) exist.
    * @param {object} context
    *        {record.Record}	.currentRecord
    *        {string}			.mode (copy, create, edit)
    */

    function pageInit(context) { 
        let customer = context.currentRecord;
        let productPreferencesCount = customer.getLineCount({ 
            sublistId : 'recmachcustrecord_sdr_prod_pref_customer'
        });

        alert(`This customer has ${productPreferencesCount} product preferences.`);
    }

     /**
    * Line Init
    * Defines the function that is executed when an existing line is selected.
    * This event can behave like a pageInit event for line items in an inline editor sublist or editor sublist.
    * @param {object} scriptContext
    * @param {record.Record}	.currentRecord
    * @param {string}			.scriptContext.sublistId	The sublist ID name.
    */

     function lineInit(context) { // Set default of Quantity to 1 when entering a new product preference

        let customer = context.currentRecord; // Reference to the record that the user is currently manipulating
        console.log(`Here ${customer.getCurrentSublistValue({sublistId : 'recmachcustrecord_sdr_prod_pref_customer',
        fieldId   : 'id'})}`);

        if (context.sublistId === 'recmachcustrecord_sdr_prod_pref_customer') { // If customer is manipulating the Performance Review sublist

            let preferredQuantity = customer.getCurrentSublistValue({
                sublistId : 'recmachcustrecord_sdr_prod_pref_customer',
                fieldId   : 'custrecord_sdr_prod_pref_qty'
            });

            if (!preferredQuantity) {
                customer.setCurrentSublistValue({
                    sublistId : 'recmachcustrecord_sdr_prod_pref_customer',
                    fieldId   : 'custrecord_sdr_prod_pref_qty',
                    value     : 1 
                })
            }
        }
    }

    /**
    * Validate Line
    * Defines the validation function that is executed before a line is added to an inline editor sublist or editor sublist.
    * This event can behave like a saveRecord event for line items in an inline editor sublist or editor sublist
    * @param {object} scriptContext
    * @param {record.Record}	.currentRecord
    * @param {string}			.scriptContext.sublistId	The sublist ID name.
    * @returns {bool}	true if the sublist line is valid and the addition is successful. false otherwise.
    */

    function validateLine(context) { // preferred quantity cannot be more than 10
        let customer = context.currentRecord;
        let isValid = false;

        if (context.sublistId === 'recmachcustrecord_sdr_prod_pref_customer') {
            
            let preferredQuantity = customer.getCurrentSublistValue({
                sublistId : 'recmachcustrecord_sdr_prod_pref_customer',
                fieldId   : 'custrecord_sdr_prod_pref_qty',
            });

            if (preferredQuantity > 10) {
                alert('You have selected a preferred quantity that exceeds the limit of 10');
                isValid = false;
            
            }
            else {
                isValid = true;
            }
           
        }

        return isValid;
    }

    return {
        fieldChanged: fieldChanged,
        saveRecord: saveRecord,
        pageInit: pageInit,
        lineInit: lineInit,
        validateLine: validateLine
    }
 });
