/**
 * sdr_mr_invoice_totals.js 
 * @NApiVersion 2.1
  *@NScriptType MapReduceScript
 */
define(['N/search'],
/**
 * @param {search} search
 */
function(search) {
    /**
     * Marks the beginning of the Map/Reduce process and generates input data. 
     * 
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     * 
     * @return {Array|Object|Search|RecordRef} inputSummary
     */
    function getInputData() {
        let invSearch = search.create({
            type : search.Type.TRANSACTION,
            filters : [
                ['type', search.Operator.ANYOF, 'CustInvc'], 'and',
                ['mainline', search.Operator.IS, true]
            ],
            columns : ['entity', 'total']
        });

        return invSearch;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair
     * 
     * @param {MapSummary} context - Data collection containing the key/value pairs
     */

    function map(context) {
        let searchResult = JSON.parse(context.value);
        
        let customer = searchResult.values.entity.text;
        let total = searchResult.values.total;

        context.write({
            key: customer, 
            value: total
        });
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group
     * 
     * @param {ReduceSummary} context - Data collection containing the groups to 
     */

    function reduce(context) {
        let total = 0;
        for (let i in context.values) {
            total += parseFloat(context.values[i]);
        }

        log.debug('Totals', 'Customer: ' + context.key + '\n' +
                                'Total: ' + total);
    }

    /**
     * Execute when the summarize entry point is triggered and applies to the 
     * 
     * @param {Summary} summary - Holds statistics regarding the execution of a map
     */

    function summarize(summary) {
        log.audit('Number of queues', summary.concurrency);

        log.error('Input error', summary.inputSummary.error);

        summary.mapSummary.errors.iterator().each(function(code, message){
            log.error('Map Error: ' + code, message);
            return true;
        });

        summary.reduceSummary.errors.iterator().each(function(code, message){
            log.error('Reduce Error: ' + code, message);
            return true;
        });
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});