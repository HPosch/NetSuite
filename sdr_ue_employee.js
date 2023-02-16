/**
 *sdr_ue_employee.js
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

//  Walkthrough: Scripting a Custom Entity Field
//
//  Goals: 
//  - Create a custom field called Employee Code
//  - Extract Employee Code, Supervisor Name, and Supervisor ID from the record
//
//  Skills Covered:
//  - Create a custom field - SuiteBuilder
//  - Get and set values from a record object 

define([], function() {

    function afterSubmit(context) {
 
        // First get a reference to the record you're saving
        var employee = context.newRecord;
        var empCode = employee.getValue('custentity_sdr_employee_code');
        var supervisorName = employee.getText('supervisor');
        var supervisorID = employee.getValue('supervisor');
 
        log.debug('Employee Code', empCode);
        log.debug('Supervisor ID', supervisorID);
        log.debug('Supervisor Name', supervisorName);
    }
 
    return {
        afterSubmit: afterSubmit
    }
 });