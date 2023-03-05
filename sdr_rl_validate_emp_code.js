/**
 * sdr_rl_validate_emp_code.js
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

define([], function() {

    /**
    * doGet
    * @param {Object} params - request body
    * @returns {string | Object} //Returns a string when request Content-Type is 'text/plain'.  Returns an Object when request Content-Type is application/json or application/xml.
    * @returns {httpsResponse}		
    */

    function _get(params) {
        let empCode = params.sdr_emp_code;

        if (empCode === 'X') {
            return 'invalid';
        }
        return 'valid';
    }

    return {
        get: _get,
 
    }
});
