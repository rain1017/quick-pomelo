'use strict';

var should = require('should');
var path = require('path');
var child_process = require('child_process');
var quick = require('../lib');
var logger = quick.logger.getLogger('test', __filename);
var P = quick.Promise;
P.longStackTraces();

var memdbClusterPath = '/usr/local/bin/memdbcluster';

var execMemdbClusterSync = function(cmd){
    var configPath = path.join(__dirname, '.memdb.js');
    var output = child_process.execFileSync(process.execPath, [memdbClusterPath, cmd, '--conf=' + configPath]);
    logger.info(output.toString());
};

exports.initMemdbSync = function(){
    execMemdbClusterSync('drop');
    execMemdbClusterSync('start');
};

exports.closeMemdbSync = function(){
    execMemdbClusterSync('stop');
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
            port : 32017,
        }
    },

    modelsPath : 'lib/models',
};
