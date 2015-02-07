'use strict';

var Q = require('q');
var util = require('util');
var pomelo = require('pomelo');
var quick = require('quick-pomelo');
var pomeloLogger = require('pomelo-logger');
var pomeloConstants = require('pomelo/lib/util/constants');
var pomeloAppUtil = require('pomelo/lib/util/appUtil');
var logger = pomeloLogger.getLogger('pomelo', __filename);

var app = pomelo.createApp();
app.set('name', 'quick-pomelo');

// configure for global
app.configure('all', function() {

	app.enable('systemMonitor');

	// rpc client configurations
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

	app.loadConfigBaseApp('redisConfig', 'redis.json');
	app.loadConfigBaseApp('mongoConfig', 'mongodb.json');

	var loggerConfig = app.getBase() + '/config/log4js.json';
	var loggerOpts = {
		serverId : app.getServerId(),
		base: app.getBase(),
	};
	quick.configureLogger(loggerConfig, loggerOpts);
	pomeloLogger.configure(loggerConfig, loggerOpts);

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
			}
			tryShutdown();
			return;
		}

		Q.ninvoke(pomeloAppUtil, 'optComponents', app.loaded, 'beforeStop')
		.then(function(){
			shutdown();
		}, function(e){
			logger.error(e.stack);
		});
	};

	app.set('errorHandler', function(err, msg, resp, session, cb){
		resp = {
			code : 500,
			stack : err.stack,
			message : err.message,
		};
		cb(err, resp);
	});

	app.set('authFunc', function(auth){
		var playerId = auth;
		return playerId;
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


app.configure('all', 'connector|area|autoscaling|allocator', function(){
	app.route('area', quick.routes.area);

	var opts = {
		redisConfig : app.get('redisConfig'),
		mongoConfig : app.get('mongoConfig'),
		areaClasses : [require('./app/areas/room')],
	};
	app.load(quick.components.areaBackend, opts);

	opts = {
		mongoConfig : app.get('mongoConfig'),
		playerClass : require('./app/player'),
	};
	app.load(quick.components.playerBackend, opts);

	opts = {
		cacheTimeout : 30 * 1000,
	}
	app.load(quick.components.areaProxy, opts);

	opts = {};
	app.load(quick.components.playerProxy, opts);
});

app.configure('all', 'area', function(){
	var opts = {};
	app.load(quick.components.areaServer, opts);
});

app.configure('all', 'autoscaling', function(){
	var opts = {};
	app.load(quick.components.autoScaling, opts);
});

app.configure('all', 'allocator', function(){
	var opts = {};
	app.load(quick.components.defaultAreaAllocator, opts);
});

app.configure('development', function(){
	require('heapdump');
	require('q').longStackSupport = true;
	pomeloLogger.setGlobalLogLevel(pomeloLogger.levels.ALL);
});

app.configure('production', function(){
	pomeloLogger.setGlobalLogLevel(pomeloLogger.levels.INFO);
});

process.on('uncaughtException', function(err) {
	logger.error('Uncaught exception: %s', err.stack);
});

app.start();
