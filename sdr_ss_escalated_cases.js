/**
 *sdr_ss_escalated_cases.js
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(['N/search'], function(search){
    /**
     * @param {search} search
     */
    /**
     * Definition of the Scheduled script trigger point.
     * 
     * @param {Object} context
     * @param {string} context.type - The context in which the script is executed.
     */

    function execute(context) {
        // let caseSearch = search.load({
        //     id: 'customsearch_sdr_escalated_searches'    
        // });

        let caseSearch = search.create({
            type : search.Type.SUPPORT_CASE,
            filters : [
                search.createFilter({
                    name : 'status', // Field that you're searching for
                    operator : search.Operator.ANYOF,
                    values : 3 // 3 = Escalated
                }),
                search.createFilter({
                    name : 'title',
                    join: 'employee',
                    operator : search.Operator.HASKEYWORDS,
                    values : 'Support'
                })
            ],
            columns : [
                search.createColumn({name : 'title'}),
                search.createColumn({name : 'startdate'}),
                search.createColumn({name : 'assigned'}),
                search.createColumn({name : 'status'}),
                search.createColumn({name : 'department', join : 'employee'}),
                search.createColumn({name : 'title', join: 'employee'}),
            ]
        });

        let searchResults = caseSearch.run().getRange({
            start : 0,
            end : 9
        }); 

        // Loop through results
        for (let i=0; i < searchResults.length; i++) {
            let subject = searchResults[i].getValue('title');
            let assignedTo = searchResults[i].getText('assigned');
            let status = searchResults[i].getValue('status');
            let department = searchResults[i].getValue({
                name: 'department',
                join: 'employee'
            });
            let jobTitle = searchResults[i].getValue({
                name: 'title',
                join: 'employee'
            });

            log.debug('Case Info', 'Subject: ' + subject + '\n' +
                                    'Status: ' + status + '\n' +
                                    'Job Title: ' + jobTitle);
        }

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
    }
    
});