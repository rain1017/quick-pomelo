'use strict';

var should = require('should');
var quick = require('../lib');
var P = quick.Promise;
P.longStackTraces();

exports.memdbConfig = {
    backend : {
        engine : 'mongodb',
        url : 'mongodb://localhost/quick-pomelo-test',
        options : {},
    },
    shards : {
        area1 : {
            host : '127.0.0.1',
            port : 31017,
        }
    },

    modelsPath : 'lib/models',
};
