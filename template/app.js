'use strict';

var pomelo = require('pomelo');
var quick = require('quick-pomelo');

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

	app.loadConfigBaseApp('redisConfig', 'redis.json');
	app.loadConfigBaseApp('mongoConfig', 'mongodb.json');

	var opts = {
		redisConfig : app.get('redisConfig'),
		mongoConfig : app.get('mongoConfig'),
		cacheTimeout : 30 * 1000,
		areaTypes : {'room' : require('./app/areas/room')},
	};
	app.load(quick.components.areaManager, opts);
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
});

process.on('uncaughtException', function(err) {
	console.error('Uncaught exception: ', err);
});

app.start();
