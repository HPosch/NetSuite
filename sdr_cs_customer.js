/**
 *sdr_cs_customer.js
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */

 define([], function() {
 /**
 * Field Changed
 * Defines the function that is executed when a field is changed by a user or client call.
 * This event may also execute directly through beforeLoad user event scripts.
 * The following sample tasks can be performed:
 * Provide the user with additional information based on user input.
 * Disable or enable fields based on user input.
 * For an example, see SuiteScript Client Script Sample.
 * Note This event does not execute when the field value is changed or entered in the page URL. Use the pageInit function to handle URLs that may contain updated field values. See pageInit(scriptContext).
 * @param {object} scriptContext
 *        {record.Record}	.currentRecord
 *        {string}			.scriptContext.sublistId	The sublist ID name.
 *        {string}			.scriptContext.fieldId		The field ID name.
 *        {string}			.scriptContext.line			The line number (zero-based index) if the field is in a sublist or a matrix.
 *        {string}			.scriptContext.column		The column number (zero-based index) if the field is in a matrix.  If the field is not in a matrix, the default value is undefined.
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
 
    return {
        fieldChanged: fieldChanged
    }
 });
