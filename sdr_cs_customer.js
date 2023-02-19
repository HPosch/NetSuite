/**
 *sdr_cs_customer.js
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */

 define([], function() {
 
    function fieldChanged(context) {
        let customer = context.currentRecord;

        let apply = customer.getValue('custentity_sdr_apply_coupon');
        let couponCode = customer.getField('custentity_sdr_coupon_code');

        if(context.fieldId === 'custentity_sdr_apply_coupon'){ // if user checks apply coupon field
           
            if (apply) { // if value exists in here? (checkbox checked?)
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
