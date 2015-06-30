'use strict';

var should = require('should');
var path = require('path');
var quick = require('../lib');
var memdb = require('memdb-client');
var P = quick.Promise;
P.longStackTraces();

var memdbLauncher = new memdb.test.Launcher({conf : path.join(__dirname, '.memdb.js')});

exports.initMemdb = function(cb){
    return memdbLauncher.flushdb()
    .then(function(){
        return memdbLauncher.startCluster();
    });
};

exports.closeMemdb = function(cb){
    return memdbLauncher.stopCluster();
};

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
