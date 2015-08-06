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
/*
 * MemDB server config template
 *
 * Please modify it on your needs
 * This is plain javascript, you can add any js code here, just export the config
 */

module.exports = {
    // *** global settings for all shards ***

    // Global backend storage, all shards must connect to the same mongodb (cluster)
    backend : {
        engine : 'mongodb', // should be 'mongodb'
        url : 'mongodb://localhost/quick-pomelo', // mongodb connect string
        options : {}, // mongodb connect options
    },

    // Global locking redis, all shards must connect to the same redis (cluster)
    locking : {
        host : '127.0.0.1',
        port : 6379,
        db : 0,
    },

    // Data replication redis, one redis instance for each shard
    // You can override this in shard settings to choice different slave for each shard
    slave : {
        host : '127.0.0.1',
        port : 6379,
        db : 0,
    },

    // Log settings
    log : {
        // Log file path
        //path : '/tmp',
        // Log Level (one of 'ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF')
        // Please set to WARN on production
        level : 'WARN',
    },

    // Promise settings
    promise : {
        // Enable long stack trace, disable it on production
        longStackTraces : false,
    },

    // user for memdbcluster ssh login, default current user
    // when start using memdbcluster, make sure you have ssh permission (without password) on all servers,
    // and the memdb version, install folder, config files are all the same in all servers
    user : process.env.USER,

    // Collection settings (for index), modify it on your need
    collections : require('./memdb.index'),


    // *** Shard specific settings ***

    // This will override global settings on specifid shard
    shards : {
        // shardId
        player1 : {
            // server IP
            host : '127.0.0.1',
            // listen port
            port : 31017,
            // bind Ip
            // DO NOT bind to localhost when deploy on multiple servers
            // make sure servers can communicate with each other
            bind : '0.0.0.0',

            // Add any shard specific settings here
            // slave : {
            //     host : '127.0.0.1',
            //     port : 6379,
            //     db : 1,
            // },
        },
        // Add more shards
        // player2 : {
        //     host : '127.0.0.1',
        //     port : 31018,
        // },
        area1 : {
            host : '127.0.0.1',
            port : 31027,
        },
        team1 : {
            host : '127.0.0.1',
            port : 31037,
        },
        connector1 : {
            host : '127.0.0.1',
            port : 31047,
        },
    },

    // *** additional settings ***
    // These settings are unstable and may change in later version

    // Delay for flush changes to backend storage
    // Set it to large value to improve performance if the data delay in backend storage is not an issue.
    // persistentDelay : 600 * 1000, // number in ms, default 10 min. 0 indicates never

    // Idle time before document is removed from memory.
    // Larger value can improve performance but use more memory.
    // Set it to large value if the documents accessed via this shard is limited.
    // Do not access too many different documents in a short time, which may exhault memory and trigger heavy GC operation.
    // idleTimeout : 1800 * 1000, // number in ms, default 30 min. 0 indicates never

    // GC will be triggered when memory usage reach this limit
    // GC can be very heavy, please adjust idleTimeout to avoid GC.
    // memoryLimit : 1024, // number in MB, default 1024

    // Disable redis replica, DO NOT turn on this in production.
    // disableSlave : false, // default false

    // Slow query time
    // slowQuery : 2000, // number in ms. default 2000

    // Turn on heapdump module (https://www.npmjs.com/package/heapdump)
    // heapdump : false, // default false
};
