'use strict';

var Q = require('q');
var pomeloLogger = require('pomelo-logger');
var util = require('util');
var pomelo = require('pomelo');
var quick = require('quick-pomelo');
var pomeloConstants = require('pomelo/lib/util/constants');
var logger = pomeloLogger.getLogger('pomelo', __filename);

var app = pomelo.createApp();
app.set('name', 'quick-pomelo');

// configure for global
app.configure('all', function() {

	app.enable('systemMonitor');

	app.set('proxyConfig', {
		cacheMsg : true,
		interval : 30,
		lazyConnection : true,
		timeout : 10 * 1000,
		failMode : 'failfast',
	});

	app.set('remoteConfig', {
		cacheMsg : true,
		interval : 30,
		timeout : 10 * 1000,
	});

	// Configure memorydb
	app.loadConfigBaseApp('memorydbConfig', 'memorydb.json');
	var mdbConfig = app.get('memorydbConfig');
	mdbConfig.shard = app.getServerId();
	var serverInfo = app.getCurServer();
	mdbConfig.slave = {host : serverInfo.slaveHost, port : serverInfo.slavePort};

	// Load components
	app.load(quick.components.memorydb);
	app.load(quick.components.controllers);
	app.load(quick.components.routes);

	// Configure logger
	var loggerConfig = app.getBase() + '/config/log4js.json';
	var loggerOpts = {
		serverId : app.getServerId(),
		base: app.getBase(),
	};
	pomeloLogger.configure(loggerConfig, loggerOpts);
	quick.logger.configure(loggerConfig, loggerOpts);
	quick.memorydb.logger.configure(loggerConfig, loggerOpts);

	// Configure filter
	app.filter(quick.filters.transaction(app));

	// Add beforeStop hook
	app.lifecycleCbs[pomeloConstants.LIFECYCLE.BEFORE_SHUTDOWN] = function(app, shutdown, cancelShutDownTimer){
		cancelShutDownTimer();

		if(app.getServerType() === 'master'){

			// Wait for all server stop
			var tryShutdown = function(){
				if(Object.keys(app.getServers()).length === 0){
					shutdown();
				}
				else{
					setTimeout(tryShutdown, 200);
				}
			};
			tryShutdown();
			return;
		}

		shutdown();
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
	Q.longStackSupport = true;
	quick.q.longStackSupport = true;
	quick.memorydb.q.longStackSupport = true;

	pomeloLogger.setGlobalLogLevel(pomeloLogger.levels.ALL);
	quick.logger.setGlobalLogLevel(quick.logger.levels.ALL);
	quick.memorydb.logger.setGlobalLogLevel(quick.memorydb.logger.levels.ALL);
});

app.configure('production', function(){
	pomeloLogger.setGlobalLogLevel(pomeloLogger.levels.INFO);
	quick.logger.setGlobalLogLevel(quick.logger.levels.INFO);
	quick.memorydb.logger.setGlobalLogLevel(quick.memorydb.logger.levels.INFO);
});

process.on('uncaughtException', function(err) {
	logger.error('Uncaught exception: %s', err.stack);
});

app.start();
