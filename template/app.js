'use strict';

var pomelo = require('pomelo');
var quick = require('quick-pomelo');
var pomeloLogger = require('pomelo-logger');
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

	pomeloLogger.configure(app.getBase() + '/config/log4js.json', {
		serverId : app.getServerId(),
		base: app.getBase(),
	}, [], [app.getServerId()]);
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

app.configure('all', 'connector|area|autoscaling', function(){
	app.route('area', quick.routes.area);

	var opts = {
		redisConfig : app.get('redisConfig'),
		mongoConfig : app.get('mongoConfig'),
		cacheTimeout : 30 * 1000,
		areaClasses : {'room' : require('./app/areas/room')},
	};
	app.load(quick.components.areaManager, opts);

	var opts = {
		mongoConfig : app.get('mongoConfig'),
		playerClass : require('./app/player'),
	};
	app.load(quick.components.playerManager, opts);
});

app.configure('all', 'area', function(){
	var opts = {};
	app.load(quick.components.areaServer, opts);
});

app.configure('all', 'autoscaling', function(){
	var opts = {};
	app.load(quick.components.autoScaling, opts);
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
