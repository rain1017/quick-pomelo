'use strict';

var should = require('should');
var path = require('path');
var child_process = require('child_process');
var quick = require('quick-pomelo');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);
P.longStackTraces();

var memdbClusterPath = '/usr/local/bin/memdbcluster';

var execMemdbClusterSync = function(cmd){
    var configPath = path.join(__dirname, 'memdb.conf.js');
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
        'player-server-1' : {
            host : '127.0.0.1',
            port : 32017,
        },
        'area-server-1' : {
            host : '127.0.0.1',
            port : 32017,
        },
        'team-server-1' : {
            host : '127.0.0.1',
            port : 32017,
        },
    },
};

exports.createApp = function(serverId, serverType){
    var app = quick.mocks.app({serverId : serverId, serverType : serverType});

    app.setBase(path.join(__dirname, '..'));
    app.set('memdbConfig', exports.memdbConfig);

    app.load(quick.components.memdb);
    app.load(quick.components.controllers);
    return app;
};

