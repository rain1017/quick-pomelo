'use strict';

var should = require('should');
var Q = require('q');
var _ = require('lodash');
var redis = require('redis');
var mongoose = require('mongoose');
var sinon = require('sinon');
var logger = require('pomelo-logger').getLogger('test', __filename);
var quick = require('../lib');
var MockApp = require('./mocks/mockapp');
var Room = require('./mocks/room');
var Player = require('./mocks/player');

var redisConfig = {host : '127.0.0.1', port : 6379};
var mongoConfig = {uri: 'mongodb://localhost/quick-pomelo-test', options : {}};

Q.longStackSupport = true;

var flushdb = function(cb){
	logger.debug('start flushdb');

	var mongodb = null;
	Q.nfcall(function(cb){
		mongodb = mongoose.connect(mongoConfig.uri, mongoConfig.options, cb);
	}).then(function(){
		return Q.ninvoke(mongodb.connection.db, 'dropDatabase');
	}).then(function(){
		return Q.ninvoke(mongodb, 'disconnect');
	}).then(function(){
		var client = redis.createClient(redisConfig.port, redisConfig.host);
		client.flushdb();
		client.end();
	})
	.then(function(){
		logger.debug('done flushdb');
		cb();
	}).catch(cb);
};

var env = {

	/*
	 * @params serverId
	 * @params role
	 * @params componentOpts - {name : opts}
	 */
	createMockApp : function(serverId, role, componentOpts){
		componentOpts = componentOpts || {};

		var app = new MockApp({serverId : serverId, serverType : role});

		var areaManagerOpts = componentOpts.areaManager || {};
		areaManagerOpts.redisConfig = redisConfig;
		areaManagerOpts.mongoConfig = mongoConfig;
		areaManagerOpts.areaClasses = [Room];
		app.load(quick.components.areaManager, areaManagerOpts);

		var playerManagerOpts = componentOpts.playerManager || {};
		playerManagerOpts.mongoConfig = mongoConfig;
		playerManagerOpts.playerClass = Player;
		app.load(quick.components.playerManager, playerManagerOpts);

		if(role === 'area'){
			app.load(quick.components.areaServer, componentOpts.areaServer || {});
		}
		if(role === 'autoscaling'){
			app.load(quick.components.autoScaling, componentOpts.autoScaling || {});
		}
		if(role === 'allocator'){
			app.load(quick.components.defaultAreaAllocator, componentOpts.defaultAreaAllocator || {});
		}

		app.setRpc('area', 	{
			quickRemote : {
				invokeAreaServer: sinon.spy(function(serverId, method, args, cb){
					var remoteApp = app.getRemoteApp(serverId);
					if(remoteApp){
						Q.fcall(function(){
							return remoteApp.areaServer[method].apply(remoteApp.areaServer, args);
						}).then(function(ret){
							cb(null, ret);
						}, cb);
					}
					else{
						cb(null);
					}
				})
			}
		});

		app.setRpc('autoscaling', {
			quickRemote : {
				reportServerStatus: sinon.spy(function(route, serverId, loadAve, cb){
					cb();
				})
			}
		});

		app.setRpc('allocator', {
			quickRemote : {
				joinDefaultArea: sinon.spy(function(route, playerId, cb){
					var remoteApp = app.getRemoteAppsByType('allocator')[0];
					if(remoteApp){
						Q.fcall(function(){
							return remoteApp.defaultAreaAllocator.joinDefaultArea(playerId);
						}).then(function(ret){
							cb(null, ret);
						}, cb);
					}
					else{
						cb();
					}
				})
			}
		});
		return app;
	},

	before : function(){

	},

	beforeEach : function(cb){
		flushdb(cb);
	},

	afterEach : function(){

	},

	after : function(cb){
		flushdb(cb);
	},
};

module.exports = env;
