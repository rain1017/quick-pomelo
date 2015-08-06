// Copyright 2015 MemDB.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied. See the License for the specific language governing
// permissions and limitations under the License. See the AUTHORS file
// for names of contributors.

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
