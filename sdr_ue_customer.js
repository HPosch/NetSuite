/**
 *sdr_ue_customer.js
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

define([], function() {

    function afterSubmit(context) {
        let customer = context.newRecord;

        let customerID = customer.getValue('entityid');
        let custEmail = customer.getValue('email')
        let salesRepName = customer.getValue('salesrep');
        let salesRepNameTxt = customer.getText('salesrep');
        let couponCode = customer.getValue('custentity_sdr_coupon_code');

        log.debug('Customer ID', customerID);
        log.debug('Customer Email', custEmail);
        log.debug('Sales Rep Name', salesRepName);
        log.audit('Sales Rep Name2', salesRepNameTxt);
        log.debug('Coupon Code', couponCode);
    }
        return {
            afterSubmit : afterSubmit
        }
    });