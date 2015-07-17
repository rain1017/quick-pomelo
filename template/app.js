'use strict';

/*
 * quick pomelo template project
 *
 * start memdb first by:
 * memdbcluster start -c ./config/.memdb.js
 */

var util = require('util');
var pomelo = require('pomelo');
var quick = require('quick-pomelo');
var pomeloConstants = require('pomelo/lib/util/constants');
var P = quick.Promise;
var logger = quick.logger.getLogger('pomelo', __filename);
var pomeloLogger = require('pomelo/node_modules/pomelo-logger');

var app = pomelo.createApp();
app.set('name', 'quick-pomelo');

// configure for global
app.configure('all', function() {

    app.enable('systemMonitor');

    app.set('proxyConfig', {
        bufferMsg : true,
        interval : 30,
        lazyConnection : true,
        timeout : 10 * 1000,
        failMode : 'failfast',
    });

    app.set('remoteConfig', {
        bufferMsg : true,
        interval : 30,
    });

    // Configure memdb
    app.loadConfigBaseApp('memdbConfig', 'memdb.json');

    // Load components
    app.load(quick.components.memdb);
    app.load(quick.components.controllers);
    app.load(quick.components.routes);
    app.load(quick.components.timer);

    // Configure logger
    var loggerConfig = app.getBase() + '/config/log4js.json';
    var loggerOpts = {
        serverId : app.getServerId(),
        base: app.getBase(),
    };
    quick.logger.configure(loggerConfig, loggerOpts);

    // Configure filter
    app.filter(quick.filters.transaction(app));
    app.globalFilter(quick.filters.reqId(app));

    // Add beforeStop hook
    app.lifecycleCbs[pomeloConstants.LIFECYCLE.BEFORE_SHUTDOWN] = function(app, shutdown, cancelShutDownTimer){
        cancelShutDownTimer();

        if(app.getServerType() === 'master'){

            // Wait for all server stop
            var tryShutdown = function(){
                if(Object.keys(app.getServers()).length === 0){
                    quick.logger.shutdown(shutdown);
                }
                else{
                    setTimeout(tryShutdown, 200);
                }
            };
            tryShutdown();
            return;
        }

        quick.logger.shutdown(shutdown);
    };

    app.set('errorHandler', function(err, msg, resp, session, cb){
        resp = {
            code : 500,
            stack : err.stack,
            message : err.message,
        };
        cb(err, resp);
    });
});

//Connector settings
app.configure('all', 'gate|connector', function() {
    app.set('connectorConfig', {
        connector : pomelo.connectors.hybridconnector,
        heartbeat : 30,
    });

    app.set('sessionConfig', {
        singleSession : true,
    });
});

app.configure('development', function(){
    require('heapdump');
    quick.Promise.longStackTraces();
    quick.logger.setGlobalLogLevel(quick.logger.levels.DEBUG);
    pomeloLogger.setGlobalLogLevel(pomeloLogger.levels.DEBUG);
});

app.configure('production', function(){
    quick.logger.setGlobalLogLevel(quick.logger.levels.WARN);
    pomeloLogger.setGlobalLogLevel(pomeloLogger.levels.WARN);
});

process.on('uncaughtException', function(err) {
    logger.error('Uncaught exception: %s', err.stack);
});

app.start();
