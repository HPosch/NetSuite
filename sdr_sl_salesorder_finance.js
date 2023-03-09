/**
 * sdr_sl_salesorder_finance.js
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

    function onRequest(context) {

        let request = context.request;
        let response = context.response;

        if(request.method === 'GET'){
            // Parameters from URL
            let orderNo    = request.parameters.sdr_orderNo;
            let custId     = request.parameters.sdr_custId;
            let orderTotal = request.parameters.sdr_orderTotal;
            let financePrice = request.parameters.sdr_financePrice;
            let orderId = request.parameters.sdr_orderId;

            let form = serverWidget.createForm({
                title : 'Sales Order Financing'
            });

            let priceFld = form.addField({
                id : 'custpage_sdr_financing_help',
                type : serverWidget.FieldType.HELP,
                label : 'Please assign a price to the financing of this sales order, then click Submit Financing'
            });

            let orderNoFld = form.addField({
                id : 'custpage_sdr_order_no',
                type : serverWidget.FieldType.TEXT,
                label : 'Order #'
            });

            let custIdFld = form.addField({
                id : 'custpage_sdr_cust_id',
                type : serverWidget.FieldType.TEXT,
                label : 'Customer'
            });

            let orderTotalFld = form.addField({
                id : 'custpage_sdr_order_total',
                type : serverWidget.FieldType.CURRENCY,
                label : 'Total'
            });

            let financePriceFld = form.addField({
                id : 'custpage_sdr_finance_price',
                type : serverWidget.FieldType.CURRENCY,
                label : 'Financing Price'
            });

            let orderIdFld = form.addField({
                id : 'custpage_sdr_order_id',
                type : serverWidget.FieldType.TEXT,
                label : 'Order Id'
            });

            form.addSubmitButton('Save Finance Info');

            orderNoFld.defaultValue = orderNo;
            custIdFld.defaultValue = custId;
            orderTotalFld.defaultValue = orderTotal;
            financePriceFld.defaultValue = financePrice;
            orderIdFld.defaultValue = orderId;

            orderNoFld.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            custIdFld.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            orderTotalFld.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            orderIdFld.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });

            response.writePage(form);   

        } else { // POST
            log.debug('parameters', request.parameters);
          
            let orderId = request.parameters.custpage_sdr_order_id;
            let financePrice = request.parameters.custpage_sdr_finance_price;

            log.debug('finance price', financePrice);

            let order = record.load({
                type : 'salesorder',
                id : orderId
            });

            order.setValue('custbody_sdr_financing_price', financePrice);
            order.save();

            order = record.load({
                type : 'salesorder',
                id : orderId
            });

            let price = order.getValue('custbody_sdr_finance_price');
            log.debug('price', price);

            redirect.toRecord({
                type : 'salesorder',
                id : orderId
            });
        }
    };

    return {
        onRequest: onRequest
    }
});
