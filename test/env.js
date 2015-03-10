'use strict';

var should = require('should');
var Q = require('q');
Q.longStackSupport = true;
var redis = require('redis');
var mongoose = require('mongoose');
var logger = require('pomelo-logger').getLogger('test', __filename);
var App = require('./mocks/app');

exports.memorydbConfig = function(){
	return {
		_id : 's1',
		redisConfig : {host : '127.0.0.1', port : 6379},
		backend : 'mongoose',
		backendConfig : {uri : 'mongodb://localhost/quick-pomelo-test', options: {}},
		slaveConfig : {host : '127.0.0.1', port : 6379},
		modelsPath : 'lib/models',
	};
};

exports.controllersConfig = function(){
	return {basePath : 'lib/controllers'};
};

exports.clearRedis = function(redisConfig){
	var client = redis.createClient(redisConfig.port, redisConfig.host);
	return Q.nfcall(function(cb){
		client.flushdb(cb);
	})
	.then(function(){
		client.quit();
	});
};

exports.clearMongo = function(mongoConfig){
	var mongodb = null;
	return Q.nfcall(function(cb){
		mongodb = mongoose.connect(mongoConfig.uri, mongoConfig.options, cb);
	}).then(function(){
		return Q.ninvoke(mongodb.connection.db, 'dropDatabase');
	}).then(function(){
		return Q.ninvoke(mongodb, 'disconnect');
	});
};

exports.cleardb = function(cb){
	var config = exports.memorydbConfig();

	logger.debug('start flushdb');
	return Q.fcall(function(){
		return exports.clearRedis(config.redisConfig);
	})
	.then(function(){
		return exports.clearRedis(config.slaveConfig);
	})
	.then(function(){
		return exports.clearMongo(config.backendConfig);
	})
	.then(function(){
		logger.debug('done flushdb');
	})
	.nodeify(cb);
};

exports.createMockApp = function(serverId, serverType){
	return new App({serverId : serverId, serverType : serverType});
};
