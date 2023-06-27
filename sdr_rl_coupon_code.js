/**
 *sdr_rl_coupon_code.js
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@ModuleScope Public
 */

"use strict";

/**
 * doGet
 * @param {string | Object}		requestBody - request body
 * @returns {string | Object}	//Returns a string when request Content-Type is 'text/plain'.  Returns an Object when request Content-Type is application/json or application/xml.
 * @returns {httpsResponse}
 */

define([], function () {
  // Validates coupon code
  function _get(params) {
    log.debug("In RESTlet",''); //params.sdr_couponcode);
    let couponCode = params.sdr_couponcode;
    // The only valid coupon code is ABC12
    if (!couponCode) {
      return "hello";
    } else {
      if (couponCode !== "ABC12") {
        return "invalid";
      }
      return "valid";
    }
  }

  return {
    get: _get,
  };
});
