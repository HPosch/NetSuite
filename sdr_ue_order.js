/**
 * sdr_ue_order.js
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

define(['N/record', 'N/redirect'],
    
function(record, redirect) {

    function afterSubmit(context) {

        let order = context.newRecord;

        redirect.toSuitelet({
            scriptId : 'customscript_sdr_sl_salesorder_finance',
            deploymentId : 'customdeploy_sdr_sl_salesorder_finance',
            parameters : {
                sdr_orderNo : order.getValue('tranid'),
                sdr_custId : order.getValue('entity'),
                sdr_orderTotal: order.getValue('total'),
                sdr_financePrice: order.getValue('custbody_sdr_financing_price'),
                sdr_orderId: order.id
            }
        });
    }

    return {
        afterSubmit: afterSubmit
    }
});

