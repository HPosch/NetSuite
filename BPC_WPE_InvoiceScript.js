/**  WPE - Custom Invoice Generator and Auto apply Credits/Payments.
*   This module contains the scripting for generating the custom PDF and scripting that will automatically apply any open credits that a customer has to new invoices that are created for that customer.  It will then send an email to that customer with an attatched PDF invoice if that customer has terms selected.  If not it will wait approximately  10 minutes (via a scheduled script that runs every 15 minutes checking for invoices over 10 minutes old) for a payment to come through before sending the invoice to the customer.  If a payment is received, it will send the invoice to that customer.

*   Module History:
*   Version         Date                 Author             Remarks
*       1.0        27 August 2015       deastes             initial create
*       1.1         1 Sept              deastes             Added some filtering and logic on the afterSubmit UserEvent to improve speed and governance.
*       1.2         18 Sept             deastes             Changed some of the invoice layout, made a custom credit pdf and added some logic for it.
*       1.3         22 Sept             deastes             Worked on some of the invoice layout design.
*       1.4         23 Sept             deastes             Continued work on the invoice Layout.
*       1.5         24 Sept             deastes             Simplified the html into one string.  Leveraged JSP in the html - seems to have made the script run a lot faster.
*       1.6         28 Sept             deastes             Updated PDF layout again.  Finally have return coupon sticking to bottom unless it has to be pushed to the next page.
*       1.7         5 Oct               deastes             Changed the PDF layout again to move aging to bottom of the page.
*       1.8         9 Oct               deastes             A small change made to the saved search used to apply open payments to a new Invoice when it is saved.
*       1.9         14 Oct              deastes             Changed auto-apply scripts to run on 'edit' as well as create.
*       2.0         23 Oct              deastes             Updated script to sort payments and credit memos by Internal ID to apply the oldest ones first.
*       2.1         30 Oct              deastes             Several small updates made to the PDF generating script.
*       2.2          9 Nov              deastes             Finished updating layout so that it looks good on invoices with up to 100 items and spread out across 3 pages.
*       2.3         13 Nov              deastes             Updated the scheduled email script to take into account new checkbox 'do not send email' and to send credit memo PDFs as well.
*       2.4         17 Nov              deastes             Changed the naming convention of the PDF file returned, created some error handling when trying to send emails(i.e. missing email).
*       2.5          4 Dec              deastes             Added a couple of fields onto the PDF that were sourced from the customer record.
*       2.6         17 Dec              deastes             Updates to PDF script.  Added Service Start and End dates on the line item level.
*       2.7         23 Dec              deastes             Allowed for itemd description on PDF and adjusted pagination based on descripting length if it takes more than 1 line.
*       2.8          8 Jan 2016         deastes             Changed the send email scheduled script to mark a new checkbox field 'email sent' to keep track of invoices and credit memos that have been sent.
*       2.9          4 Mar              anthonywpe          Added a filter to not pull Credit Memos and Payments marked as Don't Auto Apply.
*       3.0          7 Mar              deastes             Changed the method of getting aging for invoice PDFs and changed the layout design.
*       3.1         28 Mar              deastes             Changed invoice body html to autosize for P.O. Number.
*       3.2         29 Mar              deastes             Made the sendEmail script run off of email templates.
*       3.3          1 April            deastes             Changed the send email script to send to multiple contacts for each customer and to link each of these communications with the customer record
*       3.4          3 April            deastes             Added company name from the primary contact to a new line on the 'bill to:' section of the PDF.
*       3.5         28 April            erichaase           BILL-3373: gracefully handle situation when customer doesn't have any contacts when creating PDF for email
*       3.6         11 May              deastes             Scrub the Company name of reserved characters that can cause errors in the creation of invoice and credit memo PDFs.
*       3.7         16 May              deastes             Fix Typo - change balances to balance of invoice PDFs.
*       3.8         19 May              deastes             Updated script to not apply unapplied credit memos and payments to invoices marked as 'Do Not Apply'.
*       3.9          8 Jun              deastes             Fixed small typo on the invoice PDF.
*       4.0         16 Jun              deastes             Changed the aging on invoice PDFs and removed 'Service Period' from invoice PDFs.
*       4.1          7 July             deastes             Some final updates to the PDF layout. Changed spacing and wording.
*       4.2         11 July             deastes             Changes to some pdf layout.
*       4.3         12 Sept             deastes             Changed the source of the company name and added first and last name to the billed to field.
*       4.4         4 Oct               deastes             Scrubbed firsname and last name field of '&' special character.
*       4.5         6 Oct               deastes             Return Company name to the bill to information on the invoice and credit memo pdfs.
*       4.6        23 Oct               deastes             Add an instruction line on the invoice PDF for requesting PO number.
*       4.7        25 Oct               deastes             Have the instruction line show up on only invoices that do not have 'Terms:On Receipt'
*       4.8        12 Nov               deastes             Add account name to subject line on credit memo and invoice emails and change month date to abbreviation.
*       4.9         2 Mar               deastes             Changed field source for file name and separated most HTML code to separate files.
*       5.0         9 Oct 17            jmomara             Implemented support for VAT details.
*       5.1         4 Jan 18            jmomara             Corrected xml exception with special characters in address fields. Corrected issue with html attributes not getting reset.
*       5.2         5 Jun 18            jmomara             Added check box filter for primary contacts search.
*		5.3		   10 May 19            alopez (WPE)        Added new bank remittance details
*		5.4		   10 Dec 19			acameron (WPE)		Removed agressive remitance info
*		5.5		   05 Feb 20			acameron (WPE)		Center Type in itmes, Add lanquage for terms invoice issue w/ support pin
*		5.6		   11 Feb 20			acameron (WPE)		Add support for multicurrency
*		5.7		   06 Mar 20			acameron (WPE)		Fix MC Bug for people paying in USD but still wanting to see tax in their regions local currency for non us residents
*       5.8        16 Sep 20            alopez (WPE)        Updated scheduled date filter to only look back 60days and transaction is marked 'Do not email' if no contacts returned.
*		5.9		   26 Apr 21			alopez (WPE)        Updated logic to handle India GST
*		6.0		   28 Apr 21			alopez (WPE)		Updated currency conversion logic. Doesn't convert when transaction made in local currency
*		6.1		   13 Aug 22			bversiga (WPE)		Added a check to prevent sending emails for ESM/USB invoices.
*/

var EMAIL_AUTHOR = nlapiGetContext().getSetting('SCRIPT', 'custscript_bpc_email_author');
var INVOICE_EMAIL_TEMPLATE = nlapiGetContext().getSetting('SCRIPT', 'custscript_bpc_invoiceemails');
var breaks = 0;
var html;
var record;
var IS_REMITTANCE = true;
var ADDRESS_LINE1 = 'WP Engine, Inc.';
var ADDRESS_LINE2 = 'P.O. Box 734427';
var ADDRESS_LINE3 = 'Dallas, TX 75373-4427';
var ADDRESS_LINE4 = 'United States';
var PAYMENT_LINE1 =
    '<tr> <td style="width: 30%;">Account</td><td style="width: 70%;">${record.entity}</td></tr><tr> <td>Amount Due</td><td>${record.amountremainingtotalbox}</td></tr><tr> <td>Amount Paid </td><td>$______.__</td></tr><tr> <td>Invoice #</td><td>${record.tranid}</td></tr><tr> <td>Invoice Date:</td><td>${record.trandate}</td></tr>';
var PAYMENT_LINE2 = '<strong>';
PAYMENT_LINE2 += 'Please reference your Invoice # on all payments';
//PAYMENT_LINE2 += '<br/> Invoices must be paid in US dollars';
PAYMENT_LINE2 += /*'<br/> Electronic Payment Instructions:*/ '</strong>';
//PAYMENT_LINE2 += '<p style= "margin-top:3px;margin-bottom:3px;color:red;font-weight:bold;">NEW ELECTRONIC PAYMENT INSTRUCTIONS:</p>';
PAYMENT_LINE2 += '<br/> Bank Name: &nbsp;JPMorgan Chase';
PAYMENT_LINE2 += '<br/> Account Name: &nbsp;WP Engine, Inc.';
PAYMENT_LINE2 += '<br/> Routing #: &nbsp;021000021 (Wire) or 111000614 (ACH)';
PAYMENT_LINE2 += '<br/> Account #: &nbsp;335890528';
PAYMENT_LINE2 += '<br/> Swift Code: &nbsp;CHASUS33';
PAYMENT_LINE2 += '<br/> Bank Address: &nbsp;New York, NY&nbsp;10017';
var TERMS_ON_RECEIPT = 4;
var terms;

var VAT_EU_DESCRIPTION =
    '* Under the regulation of the EU we do not charge VAT on services provided to VAT registered businesses in other member countries. According to the reverse charge regulation, tax liability transfers to the recipient of services.';

var CUSTOMER_PLAN_OBJ = {
    1532: 'Business',
    3532: 'Business',
    2532: 'Personal',
    1332: 'Personal',
    2832: 'Professional',
    3632: 'Professional'
};
var PLAN_BUSINESS_ARR = [1532, 3532];
var PLAN_PERS_PROF_ARR = [2532, 1332, 2832, 3632];
var MRR_LIMIT = 349;
var planPosition = 0;
//var CUSTOMER_PLAN_OBJ = {204453: 'Business', 204253: 'Business', 203553: 'Personal', 203253: 'Personal', 204053: 'Professional', 203853: 'Professional'};  // Dev 2

/**
 * Safe function to check for null, empty, or whitespace characters
 * @param {any} input
 * @returns {string} - Returns true if the input is null, empty string or undefined
 */
function isNullOrWhitespace(input) {
    if (typeof input === 'string') {
        return !input || !input.trim();
    }
    if (typeof input === 'undefined' || input === null) {
        return true;
    }
    return false;
}

/**
 * Adds a button to the form in beforeLoad User Event Script
 * @param {String} type Given by Netsuite
 * @param {Object} form Given by Netsuite
 */
function beforeLoad_AddButton(type, form) {
    if (type != 'view') {
        return;
    }
    nlapiLogExecution('DEBUG', 'Starting beforeLoad_AddButton', 'type: ' + type);
    var recordid = nlapiGetRecordId();
    var recordType = nlapiGetRecordType();
    var url;
    var script;
    var button;

    // Gets the url of the suitelet to call.
    url = nlapiResolveURL('SUITELET', 'customscript_bpc_invoice_pdf', 'customdeploy_bpc_invoice_pdf');
    url += '&recordid=' + recordid;
    url += '&recordType=' + recordType;
    script = "window.open('" + url + "')";
    if (recordType == 'invoice') {
        button = form.addButton('custpage_viewInvoice', 'View Custom Invoice', script);
    }
    if (recordType == 'creditmemo') {
        button = form.addButton('custpage_viewCreditMemo', 'View Custom Credit Memo', script);
    }
}

/* After Submit User Event function to run on invoices.  This function will run when an invoice is saved.  It will check to see if there are any open payments or credits associated with the customer, and will apply those to the invoice.  It will then
 *@ Param{string} Type given by netsuite.  Create, edit, view, xedit etc.
 */
function afterSubmit_invoice(type) {
    if (type == 'xedit') {
        return;
    }
    if (type == 'delete') {
        return;
    }
    nlapiLogExecution('DEBUG', 'Record ID', nlapiGetRecordId());
    nlapiLogExecution('DEBUG', 'TYPE:', type);
    var doNotApply = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_do_not_apply');
    if (doNotApply == 'T') {
        nlapiLogExecution('DEBUG', 'This invoice marked do not apply', 'exiting script');
        return;
    }

    try {
        var customerId = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), 'entity');
        var creditMemos = new Array();
        var payments = new Array();
        var creditMemo;
        var invoiceId = nlapiGetRecordId();
        var customer = nlapiLoadRecord('customer', customerId);
        var recipientEmail = customer.getFieldValue('email');
        terms = customer.getFieldValue('terms'); // terms of the customer.

        // Get List of payments with remaining amounts associated with customer.
        payments = getPayments(customerId);

        // if payments are found, apply those payments first.
        if (payments) {
            applyPayments(payments, invoiceId);
            nlapiLogExecution('DEBUG', 'Payments Found', payments.length);
        }

        // Gets list of Credit Memos with unapplied amounts associated with Customer on the invoice.
        creditMemos = getCreditMemos(customerId);
        // If open credits are found... apply those credits second.
        if (creditMemos) {
            nlapiLogExecution('DEBUG', 'Credits Found', creditMemos.length);
            applyCreditMemos(creditMemos, invoiceId);
        }

        // Checks to see if custom field 'email sent' is false.
        if (nlapiGetFieldValue('custbody_bpc_emailsent') == 'F') {
            var usageRemaining = nlapiGetContext().getRemainingUsage();
            nlapiLogExecution('DEBUG', 'Usage Remaining', usageRemaining);
        }
    } catch (e) {
        nlapiLogExecution('DEBUG', 'Error', e);
    }
}

/* Returns a list of Open Credit Memos associtated with a particular Customer ID
 * @param{String} customer Id
 * @returns{array object} Array list of Credit memos from the saved search
 */
function getCreditMemos(customerId) {
    var filters = new Array();
    var columns = new Array();
    var results = new Array();
    /* Saved search criteria to run that will looks for open credits associated with the customer id on the invoice.       */
    filters.push(new nlobjSearchFilter('internalid', 'customer', 'anyof', customerId)); // by customer id
    filters.push(new nlobjSearchFilter('status', null, 'anyof', ['CustCred:A'])); // status as open
    filters.push(new nlobjSearchFilter('mainline', null, 'is', ['T']));
    filters.push(new nlobjSearchFilter('custbody_do_not_apply', null, 'is', 'F'));

    columns.push(new nlobjSearchColumn('mainline', null, null));
    columns.push(new nlobjSearchColumn('trandate', null, null));
    columns.push(new nlobjSearchColumn('internalid', null, null).setSort()); //Sorts by internal ID to order results by those with the smallest internal ID(presumably the oldest records) coming first.
    columns.push(new nlobjSearchColumn('entity', null, null));
    columns.push(new nlobjSearchColumn('account', null, null));
    columns.push(new nlobjSearchColumn('amount', null, null));

    results = nlapiSearchRecord('transaction', null, filters, columns);

    return results;
}

/*This function gets a list of all payments associated with the customer ID
 * @ param{String} Customer internal Id by which to find corresponding payment records.
 */
function getPayments(customerId) {
    var filters = new Array();
    var columns = new Array();
    var results = new Array();
    /* Saved search criteria to run that will looks for payments associated with the customer id on the invoice.       */
    filters.push(new nlobjSearchFilter('internalid', 'customer', 'anyof', customerId)); // matching customer internal id
    filters.push(new nlobjSearchFilter('type', null, 'anyof', 'CustPymt')); // is customer payment
    filters.push(new nlobjSearchFilter('amountremaining', null, 'greaterthan', '0.00')); // amount remaining above 0.00
    filters.push(new nlobjSearchFilter('custbody_do_not_apply', null, 'is', 'F'));

    columns.push(new nlobjSearchColumn('internalid', null, null).setSort()); //Sorts by internal ID to order results by those with the smallest internal ID(presumably the oldest records) coming first.
    columns.push(new nlobjSearchColumn('entity', null, null));
    columns.push(new nlobjSearchColumn('account', null, null));
    columns.push(new nlobjSearchColumn('amount', null, null));

    results = nlapiSearchRecord('transaction', null, filters, columns);
    if (results) {
        nlapiLogExecution('DEBUG', 'Found Open Payments', 'Returning to script');
    }
    return results;
}

/*apply Payments.  Loops through payments to apply them to invoices.
 * @ param{array()} Array returned from saved search looking for payments with matching criteria.
 * @ param{String} Id of the invoice payements should be applied to.
 */
function applyPayments(payments, invoiceId) {
    var payment;
    var amount = 0.0;
    var invoiceAmount = parseFloat(nlapiLookupField('invoice', invoiceId, 'amountremaining'));
    /* For each payment with amount remaining that is found, this for loop will cycle through, load those records in dynamic mode.*/
    for (var i in payments) {
        payment = nlapiLoadRecord('customerpayment', payments[i].getValue('internalid'), { recordmode: 'dynamic' });
        // keeps running tally of payments to compare with invoice total
        amount += parseFloat(payment.getFieldValue('unapplied'));
        nlapiLogExecution('DEBUG', 'Invoice Amout : Payment/Credit Total', invoiceAmount + ' : ' + amount);
        nlapiLogExecution('DEBUG', 'CREDIT MEMO APPLY ITEM COUNT', payment.getLineItemCount('apply'));
        /* For each credit memo, a list of line items in which to apply those open credit memos  is cycled through in this for loop*/
        for (var y = 1; y <= payment.getLineItemCount('apply'); y++) {
            /* if the sublist credit memo on which to apply this open credit memo has a invoiceID that matches the InvoiceId of the invoice that was just saved, then that memo gets applied to that open invoice.*/
            if (payment.getLineItemValue('apply', 'internalid', y) == invoiceId) {
                nlapiLogExecution('DEBUG', 'invoice found', y);
                payment.selectLineItem('apply', y);
                payment.setCurrentLineItemValue('apply', 'apply', 'T');
                //creditMemo.setCurrentLineItemValue('apply','amount', amount);
                payment.commitLineItem('apply');
                break;
            }
        }
        //  Submits the credit memo to be saved.
        var submittedId = nlapiSubmitRecord(payment);
        // checking the total of all the payment amounts run through so far, and if that exceeds the amount on the invoice, it breaks out of the for loop because the invoice has then been paid in full, so there is no reason to continue looping through the payements.
        if (amount > invoiceAmount) {
            nlapiLogExecution('DEBUG', 'Invoice Paid In Full', 'Exiting Script');
            break;
        }
    }
}

/*apply credit memos.  Loops through credit memos to apply them to invoices.
 * @ param{array()} Array returned from saved search looking for Credit memos with matching criteria.
 * @ param{String} Id of the invoice credit memos should be applied to.
 */
function applyCreditMemos(creditMemos, invoiceId) {
    var creditMemo;
    var amount = 0.0;
    var invoiceAmount = parseFloat(nlapiLookupField('invoice', invoiceId, 'amountremaining'));
    /* For each open credit memo that is found, this for loop will cycle through, load those records in dynamic mode.*/
    for (i in creditMemos) {
        creditMemo = nlapiLoadRecord('creditmemo', creditMemos[i].getValue('internalid'), { recordmode: 'dynamic' });
        amount += parseFloat(creditMemo.getFieldValue('unapplied'));
        nlapiLogExecution('DEBUG', 'Invoice Amout : Payment/Credit Total', invoiceAmount + ' : ' + amount);
        nlapiLogExecution('DEBUG', 'CREDIT MEMO APPLY ITEM COUNT', creditMemo.getLineItemCount('apply'));
        /* For each credit memo, a list of line items in which to apply those open credit memos  is cycled through in this for loop*/
        for (var y = 1; y <= creditMemo.getLineItemCount('apply'); y++) {
            /* if the sublist credit memo on which to apply this open credit memo has a invoiceID that matches the InvoiceId of the invoice that was just saved, then that memo gets applied to that open invoice.*/
            if (creditMemo.getLineItemValue('apply', 'internalid', y) == invoiceId) {
                nlapiLogExecution('DEBUG', 'invoice found: Invoice ID', creditMemo.getFieldValue('id'));
                creditMemo.selectLineItem('apply', y);
                creditMemo.setCurrentLineItemValue('apply', 'apply', 'T');
                //creditMemo.setCurrentLineItemValue('apply','amount', amount);
                creditMemo.commitLineItem('apply');
                break;
            }
        }
        //  Submits the credit memo to be saved.
        var submittedId = nlapiSubmitRecord(creditMemo);

        if (amount > invoiceAmount) {
            nlapiLogExecution('DEBUG', 'Invoice Paid In Full', 'Exiting Script');
            break;
        }
    }
}
/**
 * Sends email with invoice PDF attatchment.
 * @param {String}           recipientEmail is passed into the send Email function.  It is the Customer Email.
 * @param {nlobjFile         object}        is passed into the send Email function.  It is the PDF created from the invoice.
 */
function sendEmail(recipientEmail, file, type, customerId, account, plan) {
    nlapiLogExecution('DEBUG', 'SENDING EMAIL', 'Running...');
    var currentuser = nlapiGetUser();
    var id = nlapiGetRecordId();
    var subject;
    var body;
    var emailMerger, mergeResult;

    // Object used to link the communication with the customer record.
    var records = new Object();
    records['recordtype'] = 'customer';
    records['entity'] = customerId;

    if (INVOICE_EMAIL_TEMPLATE) {
        emailMerger = nlapiCreateEmailMerger(INVOICE_EMAIL_TEMPLATE);
        mergeResult = emailMerger.merge();
        subject = mergeResult.getSubject();
        if (account) {
            subject = subject + ' - ' + account;
        }

        body = mergeResult.getBody();
        if (plan) {
            var plan =
                '<p style="margin-top:0in;margin-right:0in;margin-bottom:12.0pt;margin-left:0in;line-height:15.0pt;background:white;vertical-align:baseline"><i><b><span style="font-size:12.0pt;font-family:Arial,sans-serif">There are changes coming to your ' +
                plan +
                ' plan starting on your first billing renewal date on or after <span class="gmail-aqj">September 1, 2018</span>. </span></i><i><span style="font-size:9.5pt"><a href="https://wpengine.com/support/newplans" target="_blank"><span style="font-size:12.0pt;font-family:Arial,sans-serif;color:#EB6126">Read more about our new plans and the upcoming changes</span></a></span></i><i><span style="font-size:12.0pt;font-family:Arial,sans-serif">.</span></b></i><span style="font-size:9.5pt"><o:p></o:p></span></p>';
            body = replaceAll(body, '$PLAN$', plan);
        } else {
            body = replaceAll(body, '$PLAN$', '');
        }
    } else {
        if (type == 'invoice') {
            subject = 'Your WPE Invoice';
        }
        if (type == 'creditmemo') {
            subject = 'Your WPE Credit Memo';
        }
        if (type == 'invoice') {
            body = 'Attached you will find your Invoice.';
        }
        if (type == 'creditmemo') {
            body = 'Attached you will find your Credit Memo.';
        }
    }

    // tests for certain conditions.  Might want to flag failed emails to put into saved search later...?
    if (!recipientEmail || recipientEmail == '') {
        nlapiLogExecution('DEBUG', 'No Recipient email Found', 'true');
        return false;
    }
    if (!subject) {
        nlapiLogExecution('DEBUG', 'No Template Found', 'true');
        return false;
    }
    if (!body) {
        nlapiLogExecution('DEBUG', 'No Body Found', 'true');
        return false;
    }

    nlapiSendEmail(EMAIL_AUTHOR, recipientEmail, subject, body, null, null, records, file, true);
    return true;
}

/* This is a scheduled script designed to run periodically(daily?).  It will find invoices that are over 10 minutes old that have not had emails with PDF attachments sent to customers.  These will be invoices associated with customers that do not have terms and invoices that have not received payments.
 */
function scheduledScript_invoices() {
    nlapiLogExecution('DEBUG', 'Running Scheduled Script...', 'It is running...');
    var context = nlapiGetContext();
    var emergencyStop = context.getSetting('SCRIPT', 'custscript_emergency_stop');
    if (emergencyStop == 'T') {
        nlapiLogExecution('DEBUG', 'EMERGENCY STOP', 'STOPPING SCHEDULED SCRIPT');
        return;
    }
    var startDateTime = context.getSetting('SCRIPT', 'custscript_wpe_tran_send_start_date_time');
    var endDateTime = context.getSetting('SCRIPT', 'custscript_wpe_tran_send_end_date_time');

    var currentTime = new Date();
    var startTime = new Date(currentTime - 10 * 60000 + 2 * 3600000);
    var startTimeString = nlapiDateToString(startTime, 'datetime');
    var columns = new Array();
    var filters = new Array();
    var results = new Array();

    var file;
    var invoiceId;
    var customerId;
    var recipientEmail;
    var type;
    var primaryContact;
    var accountName;
    var customerPlan;

    filters.push(new nlobjSearchFilter('type', null, 'anyof', ['CustCred', 'CustInvc']));
    //filters.push(new nlobjSearchFilter('internalid', null, 'anyof', 74652766));
    // filters.push(new nlobjSearchFilter('datecreated', null, 'onorbefore', startTimeString));

    if (startDateTime && endDateTime && startDateTime !== null && endDateTime !== null) {
        var myFilter = new nlobjSearchFilter('datecreated', null, 'within', startDateTime, endDateTime);
        filters.push(myFilter);
    } else {
        filters.push(new nlobjSearchFilter('datecreated', null, 'after', 'sixtydaysago')); //16 Sep 20 - changed date
    }

    filters.push(new nlobjSearchFilter('custbody_do_not_email', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('custbody_sent', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('mainline', null, 'is', ['T']));
    filters.push(new nlobjSearchFilter('billingaccount', null, 'anyof', '@NONE@'));

    columns.push(new nlobjSearchColumn('internalid', null, null));
    columns.push(new nlobjSearchColumn('type', null, null));
    columns.push(new nlobjSearchColumn('entity', null, null));
    columns.push(new nlobjSearchColumn('billingaccount', null, null));
    columns.push(new nlobjSearchColumn('trandate', null, null));
    //columns[0].setSort(true);

    results = nlapiSearchRecord('transaction', null, filters, columns);

    var usageRemaining = context.getRemainingUsage();
    if (!results) {
        nlapiLogExecution('AUDIT', 'EXITING', 'No returned results.');
        return;
    }
    nlapiLogExecution('AUDIT', 'Saved Search Results', results.length);
    for (var i = 0; i < results.length; i++) {
        emergencyStop = context.getSetting('SCRIPT', 'custscript_emergency_stop');

        if (emergencyStop == 'T') {
            nlapiLogExecution('DEBUG', 'EMERGENCY STOP', 'STOPPING SCHEDULED SCRIPT');
            return;
        }
        if (usageRemaining > 400) {
            // do not process the invoice if the billing account exists.  This indicates it is an ESM/UBS invoice
            if (isNullOrWhitespace(results[i].getValue('billingaccount'))) {
                try {
                    invoiceId = results[i].getValue('internalid');
                    type = results[i].getValue('type');
                    if (type == 'CustInvc') {
                        type = 'invoice';
                    }
                    if (type == 'CustCred') {
                        type = 'creditmemo';
                    }
                    nlapiLogExecution(
                        'AUDIT',
                        type,
                        ' ID:' + invoiceId + '  TranDate:' + results[i].getValue('trandate')
                    );

                    customerId = nlapiLookupField(type, invoiceId, 'entity');
                    nlapiLogExecution('AUDIT', 'Customer Id', customerId);

                    customerPlan = nlapiLookupField('customer', customerId, 'custentity_plan');
                    customerPlan = CUSTOMER_PLAN_OBJ[customerPlan];
                    nlapiLogExecution('DEBUG', 'Plan Found', customerPlan);

                    customerPlan = getCustomerPlan(customerId);
                    nlapiLogExecution('DEBUG', 'Plan Found (new)', customerPlan);

                    primaryContact = findPrimaryContract(customerId);
                    recipientEmail = primaryContact.email;
                    nlapiLogExecution('DEBUG', 'Primary Contact:', JSON.stringify(primaryContact));
                    nlapiLogExecution('DEBUG', 'Primary Contact:', recipientEmail);

                    accountName = nlapiLookupField('customer', customerId, 'companyname');

                    if (recipientEmail) {
                        file = createPDF_forEmail(invoiceId, type);

                        var emailSent = sendEmail(recipientEmail, file, type, customerId, accountName, customerPlan);
                        if (emailSent) {
                            nlapiLogExecution('AUDIT', 'Email was successfully sent', 'Marking Invoice Sent...');
                            nlapiSubmitField(type, invoiceId, 'custbody_sent', 'T');
                        } else {
                            nlapiLogExecution('ERROR', 'Error Sending the Email on Invoice ID:' + invoiceId, e);
                        }
                    } else {
                        // 16 Sep 20 - mark transaction as Do Not Email when no email recipient is found.
                        nlapiSubmitField(type, invoiceId, 'custbody_do_not_email', 'T', false);
                    }
                } catch (e) {
                    nlapiLogExecution('ERROR', 'Error Creating PDF on Invoice ID:' + invoiceId, e);
                    continue;
                }
            }
        } else {
            nlapiLogExecution(
                'AUDIT',
                'Governance Limit Hit. i = ' + i.toString(),
                'Rescheduling.  Usage Remaining: ' + context.getRemainingUsage()
            );
            nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
            return;
        }
        usageRemaining = context.getRemainingUsage();
        nlapiLogExecution('DEBUG', 'Usage Remaining', usageRemaining);
    }
    nlapiLogExecution(
        'AUDIT',
        'Exiting. i = ' + i.toString(),
        'Exiting.  Usage Remaining: ' + context.getRemainingUsage()
    );
}

/**
 *@Param {int} Customer id is used to search for the primary contact(s) for the customer and who the email should be sent to.
 */
function findPrimaryContract(customerId) {
    nlapiLogExecution('DEBUG', 'FINDING PRIMARY CONTACT', '...');
    var filters = new Array();
    var results = new Array();
    var columns = new Array();
    var returnValue = {
        email: '',
        companyName: '',
        firstName: ''
    };
    var email = '';
    filters.push(new nlobjSearchFilter('company', null, 'anyof', customerId));
    filters.push(new nlobjSearchFilter('custentity_do_not_invoice', null, 'is', 'F'));
    columns.push(new nlobjSearchColumn('email', null, 'null'));
    columns.push(new nlobjSearchColumn('custentity_company', null, 'null'));
    columns.push(new nlobjSearchColumn('firstname', null, null));
    columns.push(new nlobjSearchColumn('lastname', null, null));

    results = nlapiSearchRecord('contact', null, filters, columns);

    if (!results) {
        nlapiLogExecution('DEBUG', 'PRIMARY CONTACT', 'NO RESULTS FOUND');
        return returnValue;
    }
    if (results[0].getValue('custentity_company')) {
        nlapiLogExecution('DEBUG', 'PRIMARTY CONTACT RESULTS', results);
        returnValue.companyName = '<br/>' + results[0].getValue('custentity_company');
    }
    if (results[0].getValue('firstname')) {
        returnValue.firstName = '<br/>' + results[0].getValue('firstname') + ' ' + results[0].getValue('lastname');
    }
    for (var emailNum = 0; emailNum < results.length; emailNum++) {
        if (emailNum > 9) {
            break;
        }
        if (emailNum > 0) {
            email += ', ';
        }

        email += results[emailNum].getValue('email');
    }
    returnValue.email = email;
    return returnValue;
}

/** Suitelet function that will generate a custom PDF and write it to a new page
 *@param {nlobjRequest} Netsuite request object.
 *@param {nlobjResponse} Netsuite response object.
 */
function createPDF(request, response) {
    nlapiLogExecution('DEBUG', 'Starting createPDF', 'Invoice');
    var recordID = request.getParameter('recordid');
    var type = request.getParameter('recordType');
    var file = createPDF_forEmail(recordID, type);
    //sendEmail('dbeastes@gmail.com', file);
    response.setContentType('PDF', 'test' + '.pdf', 'inline');
    response.write(file.getValue());
}

/**
 * Creates the PDF and returns it.
 * @param {String} record ID of the Invoice in from which to create the PDF
 * @returns {nlobjFile} PDF file generated by the function.
 */
function createPDF_forEmail(recordID, type) {
    var vatPosition = 790;
    var agingHeader = 855;
    planPosition = 0;
    var ppmtNeeded = 'false';
    nlapiLogExecution('DEBUG', 'Starting createPDF', type);
    var record = nlapiLoadRecord(type, recordID);
    if (!record) {
        return;
    }
    var transCurrency = record.getFieldValue('currencysymbol');
    var balanceDue = record.getFieldValue('amountremainingtotalbox');
    if (type == 'creditmemo') {
        balanceDue = 0.0;
    }
    var entityid = record.getFieldValue('entity');
    var customer = nlapiLoadRecord('customer', entityid);
    customer.selectLineItem('addressbook', 1);
    var address = customer.viewCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
    nlapiLogExecution('DEBUG', 'address', address.getFieldText('country'));

    var addressText = '<br/>' + nlapiEscapeXML(address.getFieldValue('addr1'));
    if (address.getFieldValue('addr2')) {
        addressText += '<br/>' + nlapiEscapeXML(address.getFieldValue('addr2'));
    }
    addressText +=
        '<br/>' +
        nlapiEscapeXML(address.getFieldValue('city')) +
        ', ' +
        nlapiEscapeXML(address.getFieldValue('state')) +
        ' ' +
        address.getFieldValue('zip') +
        '<br/>' +
        nlapiEscapeXML(address.getFieldText('country'));

    customer.setFieldValue('custentity_current_po_number', customer.getFieldValue('custentity_current_po_number'));
    //customer.setFieldValue('custentity_customer_vat_num', customer.getFieldValue('custentity_customer_vat_num'));
    //customer.setFieldValue('custentity_company', customer.getFieldValue('custentity_company'));
    terms = record.getFieldValue('terms');
    var renderer = nlapiCreateTemplateRenderer();
    var subsidiaryId = record.getFieldValue('subsidiary');
    var subsidiaryRecord = nlapiLoadRecord('subsidiary', subsidiaryId);
    subsidiaryRecord.setFieldValue('employerid', subsidiaryRecord.getFieldValue('employerid'));
    // nlapiLogExecution('DEBUG','TAX NUMBER:', subsidiaryRecord.getFieldValue('federalidnumber'));
    var logoid = subsidiaryRecord.getFieldValue('pagelogo');
    var file = nlapiLoadFile(logoid);
    var company_logo = file.getURL();
    var logo = '<img src="' + nlapiEscapeXML(company_logo) + '" dpi="400"/>';
    var companyBillingEmail = 'something@something.com';
    var pagination = '';
    var paymentLinks = getInvoicePayments(record);
    var totalCreditsApplied = paymentLinks.credits;
    var totalpaymentsreceived = paymentLinks.payments;
    var agingResults = {};
    var primaryContact = findPrimaryContract(entityid);

    var customerPlan = nlapiLookupField('customer', entityid, 'custentity_plan');
    customerPlan = CUSTOMER_PLAN_OBJ[customerPlan];
    customerPlan = getCustomerPlan(entityid);

    var companyName = primaryContact.companyName;
    companyName = replaceAll(companyName, '&', '&amp;');
    var firstName = primaryContact.firstName;
    nlapiLogExecution('DEBUG', 'First Name', firstName);
    firstName = replaceAll(firstName, '&', '&amp;');
    var totalSalesTax = 0.0;

    // If Bill To Country is 'US', use "old" template. Otherwise, use VAT templates
    var billToCountry = customer.getFieldValue('billcountry');
    var billToState = customer.getFieldValue('billstate');
    var custTaxId = customer.getFieldValue('custentity_customer_vat_num');
    var custQstTaxId = customer.getFieldValue('custentity_qstid');
    var cviObj = getCountryVatInfo(billToCountry, billToState);
    nlapiLogExecution('debug', 'cviObj lookupJSON', JSON.stringify(cviObj));
    var template = '';
    var taxLine = '';
    var billToVat = '';
    var billFromVat = '';
    var docTitle = '';
    var euDesc = '';
    var authorizedSignatory = '';
    var vatNeeded = 'true';
    var taxRate = 0;
    var salesTax = 0;
    var currencyCode = '';
    var symbol = '';
    var effectiveDate = '';
    var localCurrency = '';
    var salesTaxHTML = '';
    var totalCharges = 0;
    var salesTaxFromLines = 0;
    if (billToCountry != 'US' && cviObj && Array.isArray(cviObj)) {
        //for (var cviIndex = 0; cviIndex < cviObj.length; cviIndex++) {
        salesTax = buildSalesTaxLines(cviObj);
        // template = cviObj.template;
        // taxLine = cviObj.taxLine;
        // taxRate = Number(record.getFieldValue('custbody_vat_gst_tax')) * 100;
        // taxRate = taxRate.toFixed(2) + '%';
        // salesTax = taxLine + ' (' + taxRate + ')';
        taxLine = getTaxLine(cviObj);
        // Determine local currency
        currencyCode = cviObj[0].currency;
        symbol = cviObj[0].symbol;
        effectiveDate = record.getFieldValue('trandate');

        if (template == 'GST - India') {
            // India specific fields
            billToVat = custTaxId ? '<br/>' + cviObj.taxIdTerm + 'IN #: ' + custTaxId : '';
            billFromVat = cviObj.taxIdTerm + 'IN #: ' + cviObj.taxId;
            docTitle = 'Tax ';
            authorizedSignatory = nlapiLoadFile('Images/AuthorizedSignatory_HP.png'); //signature is needed on Invoices in India
            authorizedSignatory = authorizedSignatory.getURL();
            authorizedSignatory = '<img src="' + nlapiEscapeXML(authorizedSignatory) + '" dpi="400"/>';
        } else {
            billToVat = buildBillToVat(cviObj, custTaxId, custQstTaxId);
            //var billToVat = custTaxId ? '<br/>' + cviObj.taxIdTerm + ' ID #: ' + custTaxId : '';
            billFromVat = buildBillFromVat(cviObj);
            //billFromVat = cviObj.taxIdTerm + ' ID #: ' + cviObj.taxId;
            docTitle = buildDocTitle(cviObj);
            //var docTitle = template == 'GST' ? 'Tax ' : '';
            euDesc = buildEuDesc(cviObj);
            //euDesc = template == 'EU' ? VAT_EU_DESCRIPTION : '';
            vatPosition = template == 'EU' ? vatPosition - 25 : vatPosition;
        }
        //}
    } else {
        vatNeeded = 'false';
        salesTax = 'Sales Tax';
        totalSalesTax = record.getFieldValue('taxtotal');
        nlapiLogExecution(
            'AUDIT',
            '*** total sales tax before***',
            record.getFieldValue('taxtotal'));
    }

    initializeHTML(type, vatNeeded, vatPosition, agingHeader, customerPlan);



    salesTaxFromLines = totalSalesTax;
    /* initializeHTML calls getItems which will look for a line that has the descriptio Sales Tax
     * and will set totalSalesTax to the line value.The new way will get the values from the custom fields:
     *  custbody_wpe_vat_gst_tax_amount
     *  custbody_wpe_vat_gst_tax_2_amount
     */
    totalSalesTax = getTotalSalesTax(cviObj);
    nlapiLogExecution(
        'AUDIT',
        '*** total sales tax ***',
        totalSalesTax + ' sales tax from lines :' + salesTaxFromLines
    );
    salesTaxHTML = getSalesTaxHTML(cviObj, transCurrency, effectiveDate, record);
    nlapiLogExecution('DEBUG', 'totalSalesTax Up', 'totalSalesTax: ' + totalSalesTax);
    nlapiLogExecution('DEBUG', 'salesTaxFromLines Up', 'salesTaxFromLines: ' + salesTaxFromLines);
    if (totalSalesTax === 0 && salesTaxFromLines > 0) {
        nlapiLogExecution('DEBUG', 'totalSalesTax', 'Inside totalSalesTax');
        totalSalesTax = salesTaxFromLines;
        salesTaxHTML = toMoney(totalSalesTax, getCurrencySymbol(record.getFieldValue('currencysymbol')));
    }

    nlapiLogExecution('AUDIT', '*** total sales from lines ***', salesTaxFromLines);
    totalCharges = parseFloat(record.getFieldValue('total')) - totalSalesTax;
    //totalCharges = parseFloat(record.getFieldValue('total')) - salesTaxFromLines;
    // If VAT, calculate currency conversion after Sales Tax is found
    if (vatNeeded === 'true' && transCurrency !== currencyCode) {
        //confirms transacation wasn't made in local currency
        localCurrency = convertCurrency(totalSalesTax, 'USD', currencyCode, effectiveDate);
        localCurrency = nlapiFormatCurrency(localCurrency);
        localCurrency = toMoney(localCurrency, symbol);
    } else {
        localCurrency = toMoney(totalSalesTax, symbol);
    }
    nlapiLogExecution(
        'DEBUG',
        'Currency Info',
        'transCurrency: ' + transCurrency + ' - currencyCode: ' + currencyCode + ' localCurrency: ' + localCurrency
    );
    if (planPosition > 0) {
        ppmtNeeded = 'true';
    }

    html = replaceAll(html, '$PPMT$', ppmtNeeded);
    html = replaceAll(html, '$VAT$', vatNeeded);
    html = replaceAll(html, '$docTitle$', docTitle);
    html = replaceAll(html, '$logo$', logo);
    html = replaceAll(html, '$companybillingemail$', companyBillingEmail);
    html = replaceAll(
        html,
        '$totalpaymentsreceived$',
        toMoney(totalpaymentsreceived, getCurrencySymbol(record.getFieldValue('currencysymbol')))
    );
    html = replaceAll(
        html,
        '$totalcreditsapplied$',
        '(' + toMoney(totalCreditsApplied, getCurrencySymbol(record.getFieldValue('currencysymbol'))) + ') '
    );
    html = replaceAll(html, '$totalsalestax$', salesTaxHTML);
    html = replaceAll(
        html,
        '$totalCharges$',
        toMoney(totalCharges, getCurrencySymbol(record.getFieldValue('currencysymbol')))
    );
    html = replaceAll(html, '$companyName$', companyName);
    html = replaceAll(html, '$address$', addressText);
    html = replaceAll(html, '$firstName$', firstName);
    html = replaceAll(html, '$billFromVat$', billFromVat);
    html = replaceAll(html, '$billToVat$', billToVat);
    html = replaceAll(html, '$salestax$', salesTax);
    html = replaceAll(html, '$taxLine$', taxLine);
    html = replaceAll(html, '$currCode$', currencyCode);
    //The below is a calculated display for people paying in USD for a foreign company but want to see the tax after FX conversion to their regions local currency.
    html = replaceAll(html, '$localCurrency$', localCurrency); //toMoney(totalSalesTax, getCurrencySymbol(record.getFieldValue('currencysymbol'))));//localCurrency);
    html = replaceAll(html, '$euDesc$', euDesc);
    if (template == 'GST - India') {
        html = replaceAll(html, '$authSignatory$', authorizedSignatory);
    }

    /* Footer part */
    if (IS_REMITTANCE) {
        agingResults = agingSearch(entityid, balanceDue);
        html = replaceAll(
            html,
            '$agingcurrent$',
            toMoney(agingResults.current, getCurrencySymbol(record.getFieldValue('currencysymbol')))
        ); //0 is replaced with balance due
        html = replaceAll(
            html,
            '$aging30$',
            toMoney(agingResults.aging30, getCurrencySymbol(record.getFieldValue('currencysymbol')))
        );
        html = replaceAll(
            html,
            '$aging60$',
            toMoney(agingResults.aging60, getCurrencySymbol(record.getFieldValue('currencysymbol')))
        );
        html = replaceAll(
            html,
            '$aging90$',
            toMoney(agingResults.aging90, getCurrencySymbol(record.getFieldValue('currencysymbol')))
        );
        html = replaceAll(
            html,
            '$agingover90$',
            toMoney(agingResults.agingover90, getCurrencySymbol(record.getFieldValue('currencysymbol')))
        );

        html = replaceAll(
            html,
            '$agingtotal$',
            toMoney(agingResults.total, getCurrencySymbol(record.getFieldValue('currencysymbol')))
        );
        html = replaceAll(html, '$paymentline1$', PAYMENT_LINE1);
        html = replaceAll(html, '$paymentline2$', PAYMENT_LINE2);

        html = replaceAll(html, '$pagination$', pagination);
    }
    /*
    var htmlFile = nlapiCreateFile('invoice.html', 'HTMLDOC', html);
    htmlFile.setFolder('1667281');
    nlapiSubmitFile(htmlFile);
    // */
    renderer.setTemplate(html);
    renderer.addRecord('record', record);
    renderer.addRecord('company', subsidiaryRecord);
    renderer.addRecord('customer', customer);
    //renderer.addRecord('address', address);
    var xml = renderer.renderToString();
    var file = nlapiXMLToPDF(xml);
    if (type == 'invoice') {
        file.setName('WPE_Invoice_' + record.getFieldValue('tranid') + '.pdf');
    }
    if (type == 'creditmemo') {
        file.setName('WPE_Credit_' + record.getFieldValue('tranid') + '.pdf');
    }
    //file.setName('Invoice.pdf');

    return file;

    // ** Helper Functions **
    function getInvoicePayments(invoice) {
        var linksNumber = invoice.getLineItemCount('links');
        var links = { credits: 0.0, payments: 0.0 };

        for (var i = 1; i <= linksNumber; i++) {
            if (invoice.getLineItemValue('links', 'type', i) == 'Credit Memo') {
                var credit = nlapiLoadRecord('creditmemo', invoice.getLineItemValue('links', 'id', i));
                //links.credits += parseFloat(credit.getFieldValue('applied')); //links.credits += parseFloat(invoice.getLineItemValue('links', 'total', i));

                var creditLineCount = credit.getLineItemCount('apply');
                for (var j = 1; j <= creditLineCount; j++) {
                    if (credit.getLineItemValue('apply', 'internalid', j) == invoice.id) {
                        links.credits += parseFloat(credit.getLineItemValue('apply', 'amount', j));
                    }
                }
            }
            if (invoice.getLineItemValue('links', 'type', i) == 'Payment') {
                var payment = nlapiLoadRecord('customerpayment', invoice.getLineItemValue('links', 'id', i));
                //links.payments += parseFloat(payment.getFieldValue('applied')); //(invoice.getLineItemValue('links', 'total', i));

                var paymentLineCount = payment.getLineItemCount('apply');
                for (var j = 1; j <= paymentLineCount; j++) {
                    if (payment.getLineItemValue('apply', 'internalid', j) == invoice.id) {
                        links.payments += parseFloat(payment.getLineItemValue('apply', 'amount', j));
                    }
                }
            }
        }
        return links;
    }

    function getTaxLine(cviObj) {
        var returnValue = '';
        if (cviObj) {
            for (var i = 0; i < cviObj.length; i++) {
                returnValue += !isNullOrWhitespace(returnValue) ? '/' : '';
                returnValue += cviObj[i].taxLine;
            }
        }
        return returnValue;
    }

    function buildSalesTaxLines(cviObj) {
        var returnValue = '';
        var taxRates = [];
        if (cviObj) {
            taxRates.push((Number(record.getFieldValue('custbody_vat_gst_tax')) * 100).toFixed(2) + '%');
            if (cviObj.length > 1) {
                var significantDigits = 2;
                var gstTaxPercentage = parse(record.getFieldValue('custbody_wpe_vat_gst_tax_2_percentage'));
                if (gstTaxPercentage.indexOf('.') > -1) {
                    significantDigits = getRoundingPercision(gstTaxPercentage);
                }
                taxRates.push(
                    (Number(record.getFieldValue('custbody_wpe_vat_gst_tax_2_percentage')) * 100).toFixed(
                        significantDigits
                    ) + '%'
                );
            }
            for (var i = 0; i < cviObj.length; i++) {
                returnValue += !isNullOrWhitespace(returnValue) ? ':<br/>Total ' : '';

                // template = cviObj.template;
                // taxLine = cviObj.taxLine;
                // taxRate = Number(record.getFieldValue('custbody_vat_gst_tax')) * 100;
                // taxRate = taxRate.toFixed(2) + '%';
                returnValue += cviObj[i].taxLine + ' (' + taxRates[i] + ')';
            }
        }
        nlapiLogExecution('DEBUG', 'buildSalesTaxLines returnValue', returnValue);
        return returnValue;
        // template = cviObj.template;
        // taxLine = cviObj.taxLine;
        // taxRate = Number(record.getFieldValue('custbody_vat_gst_tax')) * 100;
        // taxRate = taxRate.toFixed(2) + '%';
        // salesTax = taxLine + ' (' + taxRate + ')';
    }

    function getRoundingPercision(string) {
        var returnValue = 2; // default value
        if (typeof string === 'string' && string.indexOf('.') !== -1) {
            var percentString = string.split('.')[1];
            if (percentString.length > 4) {
                // check to see if we have more than 2 significant digits
                // (2 digits for * 100 and 2 digits right of the decimal point)
                returnValue = Number(percentString.substr(2)).toString().length;
            }
        }
        return returnValue;
    }

    /**
     * Returns a string parsed from an object.  If the value is not a string an empty string is returned.
     * @param {object} value - object to parse
     */
    function parse(value) {
        if (value === undefined || value === null || value === 'null' || isObject(value)) {
            return '';
        }
        return '' + value;
    }

    /**
     * Save check to if the parameter is of type object
     * @param {*} obj - parameter to check
     * @returns {bool} - true if the object is of type object
     */
    function isObject(obj) {
        return obj === Object(obj);
    }

    function getTotalSalesTax(cviObj) {
        var returnValue = 0;
        if (cviObj) {
            returnValue += Number(record.getFieldValue('custbody_wpe_vat_gst_tax_amount'));
            if (cviObj.length > 1) {
                returnValue += Number(record.getFieldValue('custbody_wpe_vat_gst_tax_2_amount'));
            }
        }
        return returnValue;
    }

    function getSalesTaxHTML(cviObj, transCurrency, effectiveDate, record) {
        var returnValue = '';
        var taxRates = [];
        var localCurrency = 0;
        if (cviObj) {
            nlapiLogExecution(
                'DEBUG',
                'getSalesTaxHTML params',
                'cviObj.length = ' +
                cviObj.length +
                ' transCurrency = ' +
                transCurrency +
                ' effectiveDate = ' +
                effectiveDate
            );

            taxRates.push(Number(record.getFieldValue('custbody_wpe_vat_gst_tax_amount')).toFixed(2));
            if (cviObj.length > 1) {
                taxRates.push(Number(record.getFieldValue('custbody_wpe_vat_gst_tax_2_amount')).toFixed(2));
            }
            for (var i = 0; i < cviObj.length; i++) {
                returnValue += !isNullOrWhitespace(returnValue) ? '<br/>' : '';

                // If VAT, calculate currency conversion after Sales Tax is found
                // * BV * 12-29-2022 * NSDEV-833 BAPI Canada - Do we need to convert?  just format in the transCurrency
                // if (transCurrency !== cviObj[i].currency) {
                //     //confirms transacation wasn't made in local currency
                //     localCurrency = convertCurrency(taxRates[i], 'USD', cviObj[i].currency, effectiveDate);
                //     localCurrency = nlapiFormatCurrency(localCurrency);
                //     returnValue += toMoney(localCurrency, symbol);
                // } else {
                returnValue += toMoney(taxRates[i], getCurrencySymbol(record.getFieldValue('currencysymbol')));
                //}

                //toMoney(totalSalesTax, getCurrencySymbol(record.getFieldValue('currencysymbol')))
            }
        }
        nlapiLogExecution('DEBUG', 'getSalesTaxHTML returnValue', returnValue);
        return returnValue;
    }

    function buildBillToVat(cviObj, custTaxId, custQstTaxId) {
        nlapiLogExecution('DEBUG', 'params', 'cviObj.length = ' + cviObj.length + ' custTaxId = ' + custTaxId);
        var returnValue = '';
        if (cviObj) {
            for (var i = 0; i < cviObj.length; i++) {
                if (i === 0 && custTaxId) {
                    returnValue += '<br/>' + cviObj[i].taxIdTerm + ' ID #: ' + custTaxId;
                } else if (custQstTaxId) {
                    returnValue += '<br/>' + cviObj[i].taxIdTerm + ' ID #: ' + custQstTaxId;
                }
                //var billToVat = custTaxId ? '<br/>' + cviObj[cviIndex].taxIdTerm + ' ID #: ' + custTaxId : '';
            }
        }
        nlapiLogExecution('DEBUG', 'buildBillToVat returnValue', returnValue);

        return returnValue;
    }

    function buildBillFromVat(cviObj) {
        var returnValue = '';
        if (cviObj) {
            for (var i = 0; i < cviObj.length; i++) {
                returnValue += !isNullOrWhitespace(returnValue) ? '<br/>' : '';
                returnValue += cviObj[i].taxIdTerm + ' ID #: ' + cviObj[i].taxId;
                //cviObj[cviIndex].taxIdTerm + ' ID #: ' + cviObj[cviIndex].taxId;            }
            }
        }
        nlapiLogExecution('DEBUG', 'buildBillFromVat returnValue', returnValue);
        return returnValue;
    }

    function buildDocTitle(cviObj) {
        var returnValue = template == 'GST' ? 'Tax ' : '';
        nlapiLogExecution('DEBUG', 'buildDocTitle returnValue', returnValue);

        return returnValue;
        //var docTitle = template == 'GST' ? 'Tax ' : '';
    }

    function buildEuDesc(cviObj) {
        var returnValue = template == 'EU' ? VAT_EU_DESCRIPTION : '';
        nlapiLogExecution('DEBUG', 'buildEuDesc returnValue', returnValue);

        return returnValue;
        //euDesc = template == 'EU' ? VAT_EU_DESCRIPTION : '';
    }

    /* Function to initialize all the html used for generating the custom nlobjFile PDF.
     */
    function initializeHTML(type, vatNeeded, vatPosition, agingHeader, plan) {
        if (type == 'creditmemo') {
            var creditMemoHTML = nlapiLoadFile('SuiteScripts/HTML/WPE_CreditMemoPDF.html');
            html = creditMemoHTML.getValue();
        }

        if (type == 'invoice') {
            if (template == 'GST - India') {
                var checkHTMLFile = nlapiLoadFile('SuiteScripts/HTML/WPE_InvoicePDF_India.html');
            } else {
                var checkHTMLFile = nlapiLoadFile('SuiteScripts/HTML/WPE_InvoicePDF.html');
            }

            var htmlContents = checkHTMLFile.getValue();
            //nlapiLogExecution('DEBUG', 'HTML CONTENTS', htmlContents);
            html = htmlContents;
        }
        //</td></tr></table>
        var couponFooter =
            '<div> <table style="position:absolute; top:660px; width: 100%; border-top: 2px dashed; "> <tbody>';
        couponFooter += '<tr>';
        couponFooter += '<td style="width: 50%;">$logo$ <span font-size="7"> <br/>$paymentline2$ </span> </td>';
        couponFooter += '<td style="width: 50%;"> ';
        couponFooter += '<table font-size="9" style="width: 100%;" border="0" cellspacing="0" cellpadding="0" >';
        couponFooter += '<tbody>$paymentline1$</tbody>';
        couponFooter += '</table>';
        //couponFooter +=		'<p style="margin-bottom:3px;align:left; color:red; font-weight:bold;">NEW CHECK PAYMENT<br/>INSTRUCTIONS:</p>';
        couponFooter += '' + ADDRESS_LINE1 + '<br/>';
        couponFooter += '' + ADDRESS_LINE2 + '<br/>';
        couponFooter += '' + ADDRESS_LINE3 + '<br/>';
        couponFooter += '' + ADDRESS_LINE4;
        couponFooter += '</td>';
        couponFooter += '</tr>';
        couponFooter += '</tbody> </table> </div>';

        var couponFooterUnder5 =
            '<table style="position:absolute; top:660px; width: 100%; border-top: 2px dashed; "> <tbody>';
        couponFooterUnder5 += '<tr>';
        couponFooterUnder5 += '<td style="width: 50%;">$logo$ <span font-size="7"><br/>$paymentline2$  </span></td>';
        couponFooterUnder5 += '<td style="width: 50%;">';
        couponFooterUnder5 += '<table font-size="9" style="width: 100%;" border="0" cellspacing="0" cellpadding="0">';
        couponFooterUnder5 += '<tbody>$paymentline1$</tbody>';
        couponFooterUnder5 += '</table>';
        //couponFooterUnder5 +=	  	'<p style="align:left; color:red; font-weight:bold;">NEW CHECK PAYMENT<br/>INSTRUCTIONS:</p>';
        couponFooterUnder5 += '' + ADDRESS_LINE1 + '<br/>';
        couponFooterUnder5 += '' + ADDRESS_LINE2 + '<br/>';
        couponFooterUnder5 += '' + ADDRESS_LINE3 + '<br/>';
        couponFooterUnder5 += '' + ADDRESS_LINE4;
        couponFooterUnder5 += '</td>';
        couponFooterUnder5 += '</tr>';
        couponFooterUnder5 += '</tbody></table>';
        couponFooterUnder5 += '</td></tr></table>';

        var termsFound = '</td></tr></table>';
        var items = getItems();
        var agingPosition = '875px';
        var specialInstructions =
            '<table style="width: 100%; table-layout:fixed; top:10px; cell-padding:0px; border:none;" >';
        specialInstructions +=
            '<tr> <td style="width: 40%;"></td><td></td><td style="width: 60%;"> <p style="align:right">For inquiries regarding this transaction, please email billing@wpengine.com.</p></td></tr>';
        specialInstructions += '</table>';
        if (plan) {
            specialInstructions +=
                '<table style="width: 100%; table-layout:fixed; top:10px; cell-padding:0px; border:none"><tr><td style="width: 42.5%;"></td><td></td><td style="width: 57.5%;align:right"><p><b>There are changes coming to your ' +
                plan +
                ' plan starting on your first billing renewal date on or after September 1, 2018. <br/>Visit https://wpengine.com/support/newplans to learn more.</b></p></td></tr></table>';
        }
        var paginHeader = '';
        var paginFooter = '';

        html = replaceAll(html, '$itemrows$', items);

        if (type == 'invoice') {
            if (terms != TERMS_ON_RECEIPT) {
                specialInstructions =
                    '<table style="width: 100%; table-layout:fixed; top:10px; cell-padding:0px; border:none;" >';
                specialInstructions +=
                    ' <tr> <td style="width: 43%;"></td><td></td><td style="width: 57%;"> <p style="align:left; font-size: 8pt;">If a purchase order number is not referenced above or needs updating and is required by your team for payment of the balance due, please send a copy to ar@wpengine.com along with a valid Support PIN.</p></td></tr>';
                //specialInstructions += '<tr> <td style="width: 50%;"></td><td></td><td style="width: 50%;"> <p style="align:center; background:yellow;"><mark> If a Purchase Order is required, please send a copy to </mark></p><p style="align:center; background:yellow; top:-11px"><mark> ar@wpengine.com within 5 days </mark></p></td></tr>';
                //specialInstructions += '<tr> <td style="width: 50%;"></td><td></td><td style="width: 50%;"> <p style="align:center; color:red; font-weight:bold;"> Please review our new payment remittance</p><p style="align:center; color:red; font-weight:bold; top:-11px">details below.</p></td></tr>';
                specialInstructions += '</table>';
                if (plan) {
                    specialInstructions +=
                        '<table style="width: 100%; table-layout:fixed; top:10px; cell-padding:0px; border:none"><tr><td style="width: 50%;"></td><td></td><td style="width: 50%;align:right"><p><b>There are changes coming to your ' +
                        plan +
                        ' plan starting on your first billing renewal date on or after September 1, 2018. <br/>Visit https://wpengine.com/support/newplans to learn more.</b></p></td></tr></table>';
                }
                if (vatNeeded == 'false') {
                    if (breaks > 5 && breaks < 30) {
                        html = replaceAll(html, '$agingPosition$', agingPosition);
                        couponFooter = '</td></tr></table>' + couponFooter;
                        html = replaceAll(html, '$coupon$', couponFooter);
                        //planPosition = 330;
                    } else {
                        agingPosition = '600px';
                        agingHeader = 580;
                        //planPosition = agingHeader - 270;
                        html = replaceAll(html, '$agingPosition$', agingPosition);
                        html = replaceAll(html, '$coupon$', couponFooterUnder5);
                    }
                } else {
                    agingPosition = '600px';
                    vatPosition -= 285;
                    agingHeader = 560;
                    //planPosition = vatPosition - 150;
                    html = replaceAll(html, '$agingPosition$', agingPosition);
                    html = replaceAll(html, '$coupon$', couponFooter);
                    paginHeader = '</td></tr></table><div>';
                    paginFooter = '</div>';
                }
            } else {
                html = replaceAll(html, '$agingPosition$', agingPosition);
                html = replaceAll(html, '$coupon$', termsFound);
                if (vatNeeded == 'false') {
                    planPosition = agingHeader - 150;
                } else {
                    planPosition = vatPosition - 150;
                }
            }

            html = replaceAll(html, '$specialinstructions$', specialInstructions);
        }
        //replace('$watermark$',watermark);
        if (type == 'creditmemo') {
            html = replaceAll(html, '$agingPosition$', agingPosition);
            html = replaceAll(html, '$coupon$', termsFound);
        }
        if (planPosition > 0) {
            html = replaceAll(html, '$planPositionTop$', planPosition);
            planPosition += 40;
            html = replaceAll(html, '$planPositionBot$', planPosition);
        }
        html = replaceAll(html, '$vatPosition$', vatPosition);
        html = replaceAll(html, '$agingHeader$', agingHeader);
        html = replaceAll(html, '$multiPageHeader$', paginHeader);
        html = replaceAll(html, '$multiPageFooter$', paginFooter);
    }

    /**
     * This function replaces keywords in the string of the html with the dynamically created html
     * @param   {String}   text    Original Text
     * @param   {String} oldWord Word to replace
     * @param   {String} newWord New Word
     * @returns {String} Changed Text
     *
    function replaceAll(text, oldWord, newWord){
        text = (newWord==null) ? text.replace(new RegExp(escapeRegExp(oldWord), 'g'), ''):text.replace(new RegExp(escapeRegExp(oldWord), 'g'), newWord);
        return text;

        function escapeRegExp(string) {
            return string.replace(/([.*'+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        }
    }*/

    /**
     * Formats a number into money format Eg: $1,000.00
     * @param   {Number} number Number to format.
     * @param   {String} string symbol for non-USD amounts.
     * @returns {String}   Formatted text.
     */
    function toMoney(number, symbol) {
        if (number != null) {
            var sign = symbol ? symbol : '$';
            return (
                sign +
                Number(number)
                    .toFixed(2)
                    .replace(/\d(?=(\d{3})+\.)/g, '$&,')
            );
        }
    }

    /**
     * Gets all items and creates rows for them
     * @returns {String} Item rows.
     */
    function getItems() {
        var numOfItems = record.getLineItemCount('item');
        nlapiLogExecution('DEBUG', 'Num of Items:', numOfItems);
        var currency = record.getFieldValue('currencysymbol');
        var breakNum = 11;
        var i = 0;
        var salesDescription = '';
        var itemType = '';
        var qty = '';
        var price = '';
        var amount = '';
        var row = '';
        var itemRows = '';
        var items = '';
        var startDate, endDate;
        var longDescriptionOffset = 0;
        var pageBreak = 0;
        var itemsHeader =
            "<table style='table-layout:fixed; overflow:hidden; width: 100%;' border='1'> <thead> <tr> <td style='width: 38%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Description</strong></td><td style='width: 10%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Type</strong></td><td style='width: 10%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Service Start</strong></td><td style='width: 10%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Service End</strong></td><td style='width: 8%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Qty</strong></td><td style='width: 8%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Price</strong></td><td style='width: 16%; border-bottom: 1px solid;'><strong>Amount (USD)</strong></td></tr></thead> <tbody>$itemrows$</tbody></table>";
        breaks = numOfItems;

        // Create new blank page for line item overflow (3 pages total)
        if (numOfItems > 60 && numOfItems < 76 && terms != TERMS_ON_RECEIPT) {
            pagination = "</td></tr></table><table style='width: 100%; height:1000px; overflow:visible;'><tr><td>";
        }

        for (var i = 1; i <= numOfItems; i++) {
            if (template != 'GST - India') {
                row =
                    "<tr style='line-height:10px;'> <td style='font-size:10px; height:10px; width: 38%; overflow:hidden; border-right: 1px solid;align:left;'>$salesdescription$ </td><td style='width: 10%; border-right: 1px solid; align:center;'>$type$ </td><td style='align:center; width: 10%; border-right: 1px solid;'>$serviceStart$ </td><td style='align:center; width: 10%; border-right: 1px solid;'>$serviceEnd$ </td><td style='align:center; width: 8%; border-right: 1px solid;'>$qty$ </td><td style='width: 16%; align: right'>$amount$ </td></tr>";
            } else {
                row =
                    "<tr style='line-height:10px;'> <td style='font-size:10px; height:10px; width: 35%; overflow:hidden; border-right: 1px solid;align:left;'>$salesdescription$ </td><td style='width: 10%; border-right: 1px solid; align:center;'>$SAC$ </td><td style='width: 10%; border-right: 1px solid; align:center;'>$type$ </td><td style='align:center; width: 10%; border-right: 1px solid;'>$serviceStart$ </td><td style='align:center; width: 10%; border-right: 1px solid;'>$serviceEnd$ </td><td style='align:center; width: 8%; border-right: 1px solid;'>$qty$ </td><td style='width: 16%; align: right'>$amount$ </td></tr>";
            }

            // Create page break determined by number of lines and length of line descriptions
            var lineLength = i + longDescriptionOffset;
            if (
                (lineLength > 32 && lineLength < 76 && i < numOfItems && pageBreak == 0) ||
                (lineLength >= 76 && i < numOfItems && pageBreak == 1)
            ) {
                pageBreak = pageBreak + 1;
                row +=
                    "</tbody></table><table style='width: 100%;'><tbody><tr><td style='align:center;'>*Continued on the next page*</td></tr></tbody></table></td></tr></table><table style='width: 100%; height:1000px; overflow:visible;'> <tr><td><table style='table-layout:fixed; overflow:hidden; width: 100%;' border='1'> <thead> <tr> <td style='width: 40%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Description</strong></td><td style='width: 10%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Type</strong></td><td style='align:center; width: 10%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Serv. Start</strong></td><td style='align:center; width: 10%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Serv. End</strong></td><td style='align:center; width: 5%; border-bottom: 1px solid; border-right: 1px solid;'><strong>Qty</strong></td><td style='align:center; width: 15%; border-bottom: 1px solid;'><strong>Amount (USD)</strong></td></tr></thead> <tbody>";
            }

            salesDescription = record.getLineItemValue('item', 'description', i);
            salesDescription = replaceAll(salesDescription, '&', '&amp;');
            // if no sales description, don't test for length.  Otherwise test for length to ensure proper pagination.
            if (salesDescription) {
                if (salesDescription.length > 45 && salesDescription.length < 90) {
                    longDescriptionOffset = longDescriptionOffset + 1;
                } else if (salesDescription.length > 90) {
                    longDescriptionOffset = longDescriptionOffset + 2;
                }
            }
            itemType = record.getLineItemValue('item', 'itemtype', i);
            //itemType = record.getLineItemValue('item', 'description',i);
            qty = record.getLineItemValue('item', 'quantity', i);
            price = record.getLineItemValue('item', 'rate', i);
            amount = record.getLineItemValue('item', 'amount', i);
            startDate = record.getLineItemValue('item', 'revrecstartdate', i);
            endDate = record.getLineItemValue('item', 'revrecenddate', i);
            if (salesDescription == 'Sales Tax') {
                //totalSalesTax = totalSalesTax + parseFloat(amount);
                totalSalesTax = parseFloat(totalSalesTax) + parseFloat(amount);
                continue;
            }
            row = replaceAll(row, '$salesdescription$', salesDescription);
            row = template == 'GST - India' ? replaceAll(row, '$SAC$', 998315) : row;
            row = replaceAll(row, '$type$', itemType);
            row = replaceAll(row, '$qty$', qty);
            row = replaceAll(row, '$price$', toMoney(price));
            if (amount < 0) {
                row = replaceAll(row, '$amount$', '(' + toMoney(Math.abs(amount), getCurrencySymbol(currency)) + ')');
            } else {
                row = replaceAll(row, '$amount$', toMoney(amount, getCurrencySymbol(currency)));
            }
            row = replaceAll(row, '$serviceEnd$', endDate);
            row = replaceAll(row, '$serviceStart$', startDate);
            itemRows += row;
        }

        items = replaceAll(itemsHeader, '$itemrows$', itemRows);
        return itemRows;
    }

    /**
     * Searches for aging and
     * @param   {[[Type]]} entityId   [[Description]]
     * @param   {[[Type]]} balanceDue [[Description]]
     * @returns {[[Type]]} [[Description]]
     */
    function agingSearch(entityId, balanceDue) {
        var filters = [];
        var columns = [];
        var current;
        var lessThanThirty;
        var thirtyToSixty;
        var sixtyToNinety;
        var greaterThanNinety;

        filters.push(new nlobjSearchFilter('type', null, 'anyof', 'CustInvc'));
        filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
        filters.push(new nlobjSearchFilter('status', null, 'anyof', 'CustInvc:A'));
        filters.push(new nlobjSearchFilter('internalidnumber', 'customer', 'equalto', entityId));

        columns.push(new nlobjSearchColumn('daysopen', null, null));
        columns.push(new nlobjSearchColumn('amountremaining', null, null));
        columns.push(new nlobjSearchColumn('fxamountremaining', null, null));

        var results = {};
        results.current = 0.0;
        results.aging30 = 0.0;
        results.aging60 = 0.0;
        results.aging90 = 0.0;
        results.agingover90 = 0.0;
        results.total = 0.0;

        var search = nlapiSearchRecord('transaction', null, filters, columns);
        var daysOpen = 0;
        var amountRemaining = 0.0;
        if (search) {
            for (x in search) {
                daysOpen = parseInt(search[x].getValue('daysopen'));
                amountRemaining = parseFloat(search[x].getValue('fxamountremaining'));
                if (daysOpen < 30) {
                    results.current += amountRemaining;
                }
                if (daysOpen >= 30 && daysOpen < 60) {
                    results.aging30 += amountRemaining;
                }
                if (daysOpen >= 60 && daysOpen < 90) {
                    results.aging60 += amountRemaining;
                }
                if (daysOpen >= 90 && daysOpen < 120) {
                    results.aging90 += amountRemaining;
                }
                if (daysOpen >= 120) {
                    results.agingover90 += amountRemaining;
                }
            }
            results.total = results.aging30 + results.aging60 + results.aging90 + results.agingover90 + results.current;
            nlapiLogExecution('DEBUG', 'Aging Total', results.total);
        }
        return results;
    }
}

/**
 * This function replaces keywords in the string of the html with the dynamically created html
 * @param   {String} text    Original Text
 * @param   {String} oldWord Word to replace
 * @param   {String} newWord New Word
 * @returns {String} Changed Text
 */
function replaceAll(text, oldWord, newWord) {
    if (text !== null && text !== undefined) {
        text =
            newWord == null
                ? text.replace(new RegExp(escapeRegExp(oldWord), 'g'), '')
                : text.replace(new RegExp(escapeRegExp(oldWord), 'g'), newWord);
    }

    return text;

    function escapeRegExp(string) {
        return string.replace(/([.*'+?^=!:${}()|\[\]\/\\])/g, '\\$1');
    }
}

function getCustomerPlan(customerId) {
    if (!customerId) {
        return '';
    }

    var filters = [];
    var columns = [];
    filters.push(new nlobjSearchFilter('internalid', null, 'is', customerId));
    filters.push(
        new nlobjSearchFilter('custentity_plan', null, 'anyof', PLAN_BUSINESS_ARR).setLeftParens(3).setRightParens(1)
    );
    filters.push(new nlobjSearchFilter('custentity_mrr', null, 'notequalto', 375).setLeftParens(1));
    filters.push(new nlobjSearchFilter('custentity_mrr', null, 'notequalto', 400));
    filters.push(new nlobjSearchFilter('custentity_mrr', null, 'notequalto', 333.33));
    filters.push(new nlobjSearchFilter('custentity_mrr', null, 'notequalto', 459.08));
    filters.push(new nlobjSearchFilter('custentity_mrr', null, 'notequalto', 499).setOr(true).setRightParens(2));
    filters.push(
        new nlobjSearchFilter('custentity_plan', null, 'anyof', PLAN_PERS_PROF_ARR).setLeftParens(1).setRightParens(2)
    );
    columns.push(new nlobjSearchColumn('custentity_plan', null, null));
    var customerSearch = nlapiSearchRecord('customer', null, filters, columns);

    if (customerSearch && customerSearch.length > 0) {
        var custPlan = customerSearch[0].getValue('custentity_plan');
        custPlan = CUSTOMER_PLAN_OBJ[custPlan];
        return custPlan;
    } else {
        return '';
    }
}

function getCountryVatInfo(countryCode, stateCode) {
    nlapiLogExecution('DEBUG', 'getCourntryVatInfo', 'countryCode ' + countryCode + '  stateCode ' + stateCode);
    var countryVatInfoObj = []; //{};
    var filters = [];
    var columns = [];
    var stateName = '';
    filters = [['custrecord_bpc_cvi_country_code', 'is', countryCode], 'AND', ['isinactive', 'is', 'F']];
    //filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
    //filters.push(new nlobjSearchFilter('custrecord_bpc_cvi_country_code', null, 'is', countryCode));
    if (stateCode) {
        if (stateCode === 'BC') {
            stateName = 'British Columbia';
        } else if (stateCode === 'QC') {
            stateName = 'Quebec';
        } else if (stateCode === 'SK') {
            stateName = 'Saskatchewan';
        } else {
            // (stateCode === 'ON')
            stateName = 'Ontario';
        }
        filters.push('AND');
        filters.push(['formulatext: {custrecord_bpc_cvi_state_prov}', 'is', stateName]);
        //filters.push(new nlobjSearchFilter("formulatext: {custrecord_bpc_cvi_state_prov}", null, 'startswith', 'Onta'));
        //filters.push(["formulatext: {custrecord_bpc_cvi_state_prov}", "is", "Ontario"]);
        //filters.push(new nlobjSearchFilter('custrecord_bpc_cvi_state_prov', null, 'anyof', stateName));
    }
    columns.push(new nlobjSearchColumn('custrecord_bpc_cvi_template', null, null));
    columns.push(new nlobjSearchColumn('custrecord_bpc_cvi_tax_id_term', null, null).setSort(false));
    columns.push(new nlobjSearchColumn('custrecord_bpc_cvi_wpe_tax_id', null, null));
    columns.push(new nlobjSearchColumn('custrecord_bpc_cvi_tax_line_name', null, null));
    columns.push(new nlobjSearchColumn('custrecord_bpc_cvi_currency_code', null, null));
    columns.push(new nlobjSearchColumn('custrecord_bpc_cvi_currency_symbol', null, null));
    var cviSearch = nlapiSearchRecord('customrecord_bpc_country_vat_info', null, filters, columns);

    var template = '';
    var taxIdTerm = '';
    var taxId = '';
    var taxLine = '';
    var currency = '';
    var symbol = '';
    var cvi = null;

    if (cviSearch && cviSearch.length > 0) {
        for (var index = 0; index < cviSearch.length; index++) {
            const element = cviSearch[index];
            cvi = {};
            cvi.template = cviSearch[index].getText('custrecord_bpc_cvi_template');
            cvi.taxIdTerm = cviSearch[index].getValue('custrecord_bpc_cvi_tax_id_term');
            cvi.taxId = cviSearch[index].getValue('custrecord_bpc_cvi_wpe_tax_id');
            cvi.taxLine = cviSearch[index].getValue('custrecord_bpc_cvi_tax_line_name');
            cvi.currency = cviSearch[index].getValue('custrecord_bpc_cvi_currency_code');
            cvi.symbol = cviSearch[index].getValue('custrecord_bpc_cvi_currency_symbol');
            countryVatInfoObj.push(cvi);
        }
        return countryVatInfoObj;
    }
}

function startScheduledScript() {
    var status = nlapiScheduleScript(
        'customscript_bpc_scheduledscript_email',
        'customdeploy_bpc_scheduledscript_email'
    );
    nlapiLogExecution('DEBUG', 'Starting email schedule script', status);
}

function convertCurrency(amount, currFrom, currTo, effectiveDate) {
    var convertedAmount = 0;
    nlapiLogExecution(
        'debug',
        'Exchange Rate, effective date',
        'effective date = ' + effectiveDate + ' currFrom = ' + currFrom + ' currTo = ' + currTo + ' amount = ' + amount
    );
    var rate = nlapiExchangeRate(currFrom, currTo, effectiveDate);
    convertedAmount = amount * rate;
    nlapiLogExecution('Debug', 'Currency Conversion', amount + ' * ' + rate + ' = ' + convertedAmount);

    return convertedAmount;
}

function getCurrencySymbol(currency) {
    switch (currency) {
        case 'GBP':
            return '£';
            break;
        case 'EUR':
            return '€';
        case 'CAD':
            return 'C$';
        case 'AUD':
            return 'A$';
        case 'INR':
            return '₹';
        default:
            return '$';
    }
}

//createPDF_forEmail(91560534, 'invoice');
