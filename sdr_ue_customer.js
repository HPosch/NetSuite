/**
 * @NScriptType UserEventScript
 * @NApiVersion 2.0
 */

define([],
    
    function() {
    
        return {
            afterSubmit : function (context) {
                log.debug('Hello World');
            }
        };
    });