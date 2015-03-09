'use strict';

var should = require('should');
var Q = require('q');
Q.longStackSupport = true;
var redis = require('redis');
var mongoose = require('mongoose');
var logger = require('pomelo-logger').getLogger('test', __filename);
var MockApp = require('./mocks/mockapp');

var memorydbConfig = {
	redisConfig : {host : '127.0.0.1', port : 6379},
	backend : 'mongoose',
	backendConfig : {uri : 'mongodb://localhost/quick-pomelo-test', options: {}},
	slaveConfig : {host : '127.0.0.1', port : 6379},
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
	logger.debug('start flushdb');
	return Q.fcall(function(){
		return exports.clearRedis(memorydbConfig.redisConfig);
	})
	.then(function(){
		return exports.clearRedis(memorydbConfig.slaveConfig);
	})
	.then(function(){
		return exports.clearMongo(memorydbConfig.backendConfig);
	})
	.then(function(){
		logger.debug('done flushdb');
	})
	.nodeify(cb);
};

exports.before = function(){

};

exports.beforeEach = function(cb){
	exports.cleardb(cb);
};

exports.afterEach = function(){

};

exports.after = function(cb){
	exports.cleardb(cb);
};

exports.createMockApp = function(serverId, serverType){
	return new MockApp({serverId : serverId, serverType : serverType});
};
