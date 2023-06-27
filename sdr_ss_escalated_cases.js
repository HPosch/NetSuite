/**
 *sdr_ss_escalated_cases.js
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 *@ModuleScope Public
 */

'use strict';

define(['N/search', 'N/query'],

function(search, query){
    /**
     * @param {search} search
     * @param {query} query
     */

    /**
     * Definition of the Scheduled script trigger point.
     * 
     * @param {Object} context
     * @param {string} context.type - The context in which the script is executed.
     */

    function execute(context) { 

        // query here ***

        let caseQuery = query.create ({
            type: query.Type.SUPPORT_CASE
        });

        let employeeJoin = caseQuery.autojoin({
            fieldId: 'employee'
        });

        let firstCondition = caseQuery.createCondition ({
            fieldId: 'status',
            operator: query.Operator.EQUAL,
            values: 3
        })

        let secondCondition = employeeJoin.createCondition ({
            fieldId: 'title',
            operator: query.Operator.CONTAIN,
            values: 'support'
        })

        caseQuery.columns = [
            caseQuery.createColumn({
                fieldId: 'title'
            }),
            caseQuery.createColumn({
                fieldId: 'startdate'
            }),
            caseQuery.createColumn({
                fieldId: 'assigned'
            }),
            caseQuery.createColumn({
                fieldId: 'status'
            }),
            employeeJoin.createColumn({
                fieldId: 'department'
            }),
            employeeJoin.createColumn({
                fieldId: 'title'
            })
        ];

        let resultSet = caseQuery.run();
        let results = resultSet.results;
        for (let i = results.length - 1; i >= 0; i--) {
            log.debug(results[i].values);
        }

        // query end ***

        
        // Here, we are getting our search from the NS UI using the load method of the search module.
        // let caseSearch = search.load({
        //     id: 'customsearch_sdr_escalated_searches'    
        // });

        // let caseSearch = search.create({
        //     type : search.Type.SUPPORT_CASE,
        //     filters : [
        //         search.createFilter({
        //             name : 'status', // Field that you're searching for
        //             operator : search.Operator.ANYOF,
        //             values : 3 // 3 = Escalated
        //         }),
        //         search.createFilter({
        //             name : 'title',
        //             join: 'employee',
        //             operator : search.Operator.HASKEYWORDS,
        //             values : 'Support'
        //         })
        //     ],
        //     columns : [
        //         search.createColumn({name : 'title'}),
        //         search.createColumn({name : 'startdate'}),
        //         search.createColumn({name : 'assigned'}),
        //         search.createColumn({name : 'status'}),
        //         search.createColumn({name : 'department', join : 'employee'}),
        //         search.createColumn({name : 'title', join: 'employee'}),
        //     ]
        // });

        // let searchResults = caseSearch.run().getRange({
        //     start : 0,
        //     end : 9
        // }); 

        // Loop through results
        // for (let i=0; i < searchResults.length; i++) {
        //     let subject = searchResults[i].getValue('title');
        //     let incidentDate = searchResult[i].getValue('startdate')
        //     let assignedTo = searchResults[i].getText('assigned');
        //     let status = searchResults[i].getValue('status');
        //     let department = searchResults[i].getValue({
        //         name: 'department',
        //         join: 'employee'
        //     });
        //     let jobTitle = searchResults[i].getValue({
        //         name: 'title',
        //         join: 'employee'
        //     });

        //     log.debug('Case Info', `\n
        //         Subject: ${subject}
        //         Status: ${status}
        //         Incident Date: ${incidentDate}
        //         Assigned To: ${assignedTo}
        //         Department: ${department}
        //         Job Title: ${jobTitle}`);
        // }
        
        // Created from UI
        // let supportcaseSearchObj = search.create({
        //     type: "supportcase",
        //     filters:
        //     [
        //        ["status","anyof","3"], 
        //        "AND", 
        //        ["employee.title","contains","Support"]
        //     ],
        //     columns:
        //     [
        //        "title",
        //        "status",
        //        "startdate",
        //        "assigned",
        //        search.createColumn({
        //           name: "department",
        //           join: "employee"
        //        }),
        //        search.createColumn({
        //           name: "title",
        //           join: "employee"
        //        })
        //     ]
        //  });

        //  let searchResultCount = supportcaseSearchObj.runPaged().count;

        //  log.debug("supportcaseSearchObj result count",searchResultCount);

        //  supportcaseSearchObj.run().each(function(result){
        //     // .run().each has a limit of 4,000 results
        //     log.debug('Result', result.toJSON());
        //     log.debug('Employee Title', result.getValue({
        //         name: "title",
        //         join: "employee"
        //      }));

        //     return true;
        //  });
         
         /*
         supportcaseSearchObj.id="customsearch1677590419795";
         supportcaseSearchObj.title="Escalated Support Cases (copy)";
         let newSearchId = supportcaseSearchObj.save();
         */
    }

    return {
        execute: execute
    };
    
});