'use strict';

// memdb-server config for unit test

module.exports = {
    backend : {
        engine : 'mongodb',
        url : 'mongodb://localhost/quick-pomelo-test',
    },

    locking : {
        host : '127.0.0.1',
        port : 6379,
        db : 0,
    },

    slave : {
        host : '127.0.0.1',
        port : 6379,
        db : 0,
    },

    log : {
        //path : process.env.HOME + '/.memdb/log',
        level : 'INFO',
    },

    promise : {
        longStackTraces : false,
    },

    shards : {
        area1 : {
            host : '127.0.0.1',
            port : 32017,
        },
    },
};
