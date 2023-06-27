/**
 *sdr_ss_product_shortage.js
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 *@ModuleScope Public
 */

 'use strict';

 define (['N/search'], function(search){

    function execute(context){
        // let productShortageSearch = search.load({
        //     id: 'customsearch_sdr_prod_shortages'
        // });

        let productShortageSearch = search.create({
            type : search.Type.customrecord_sdr_prod_pref,
            filters : [
                search.createFilter({
                    name : 'custrecord_sdr_prod_pref_qty', // Field that you're searching for
                    operator : search.Operator.GREATERTHAN,
                    values : 2 
                }),
                search.createFilter({
                    name : 'subsidiary',
                    join: 'customer',
                    operator : search.Operator.ANYOF,
                    values : 'US-West'
                })
            ],
            columns : [
                search.createColumn({name : 'custrecord_sdr_prod_pref_customer'}),
                search.createColumn({name : 'email', join : 'customer'}),
                search.createColumn({name : 'subsidiary', join : 'customer'}),
                search.createColumn({name : 'custrecord_sdr_prod_pref_item'}),
                search.createColumn({name : 'custrecord_sdr_prod_pref_qty'}),
                search.createColumn({name : 'quantityavailable', join : 'item'}),
            ]
        });


        let searchResults = productShortageSearch.run().getRange({
            start : 0,
            end : 9
        }); 
    }

    return {
        execute: execute
    };

 });