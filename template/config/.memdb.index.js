'use strict';

// Index definitions

module.exports =  {
    // Collection name
    players : {
        // Index setting, modify it on your need
        indexes : [
            {
                // Index keys
                keys : ['areaId'],
                // Value exclude from index. Values like '', -1 occurs too often, which can make the index too large.
                // 'null' or 'undefined' is ignored by default.
                valueIgnore : {
                    areaId : [''],
                },
            },
            {
                keys : ['teamId'],
                valueIgnore : {
                    teamId : [''],
                },
            },
        ]
    }
};
