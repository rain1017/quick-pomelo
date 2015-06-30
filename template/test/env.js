'use strict';

var should = require('should');
var path = require('path');
var quick = require('quick-pomelo');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);
P.longStackTraces();

var memdbLauncher = new quick.memdb.test.Launcher({conf : path.join(__dirname, '.memdb.js')});

exports.initMemdb = function(){
    return memdbLauncher.flushdb()
    .then(function(){
        return memdbLauncher.startCluster();
    });
};

exports.closeMemdb = function(){
    return memdbLauncher.stopCluster();
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

