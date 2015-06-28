'use strict';

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
        path : '/tmp',
        level : 'DEBUG',
    },

    promise : {
        longStackTraces : true,
    },

    collections : require('../config/.memdb.index'),

    shards : {
        s1 : {
            host : '127.0.0.1',
            port : 32017,
        },
    }
};
