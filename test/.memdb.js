'use strict';

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

    event : {
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
        path : '/tmp',
        level : 'INFO',
    },

    promise : {
        longStackTraces : false,
    },

    shards : {
        area1 : {
            host : '127.0.0.1',
            port : 31017,
        },
    },
};
