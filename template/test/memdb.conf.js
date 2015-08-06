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

// memdb-server config for unit test

module.exports = {
    backend : {
        engine : 'mongodb',
        url : 'mongodb://localhost/quick-pomelo-test',
        options : {},
    },

    locking : {
        host : '127.0.0.1',
        port : 6379,
        db : 1,
    },

    slave : {
        host : '127.0.0.1',
        port : 6379,
        db : 1,
    },

    log : {
        //path : process.env.HOME + '/.memdb/log',
        level : 'INFO',
    },

    promise : {
        longStackTraces : false,
    },

    collections : require('../config/memdb.index'),

    shards : {
        s1 : {
            host : '127.0.0.1',
            port : 32017,
        },
    }
};
