/**
 *test_integraton_rl.js
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@ModuleScope Public
 */

"use strict";

define(['N/record', 'N/error'],

function(record, error) {

    /**
    * doGet
    * @param {string | Object}		requestBody - request body
    * @returns {string | Object}	//Returns a string when request Content-Type is 'text/plain'.  Returns an Object when request Content-Type is application/json or application/xml.
    * @returns {httpsResponse}		
    */

    function _get(context) {
        return JSON.stringify(record.load({
            type: context.recordtype,
            id: context.id
        }))
    }

    /**
    * doPost
    * @param {string | Object}		requestBody - request body
    * @returns {string | Object}	//Returns a string when request Content-Type is 'text/plain'.  Returns an Object when request Content-Type is application/json or application/xml.
    * @returns {httpsResponse}		
    */

    function _post(context) {
        let rec = record.create({
            type: context.recordtype,
            isDynamic: true
        });

        for (let fldName in context){
            if (context.hasOwnProperty(fldName)){
                if (fldName !== 'recordtype'){
                    log.debug('setting variable',`fldName : ${fldName} value : ${context[fldName]}`);
                    rec.setValue(fldName, context[fldName]);
                }
            }
        }

        let recordId = rec.save();
        return String(recordId); 
    }
    

    function _delete(context) {
        record.delete({
            type: context.recordtype,
            id: context.id
        });
        return String(context.id);  
    }
  
    return {
        get: _get,
        post: _post,
        delete: _delete
    }
});
