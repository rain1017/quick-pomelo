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

		var app = new MockApp({serverId : serverId});

		var areaManagerOpts = componentOpts.areaManager || {};
		areaManagerOpts.redisConfig = redisConfig;
		areaManagerOpts.mongoConfig = mongoConfig;
		areaManagerOpts.areaClasses = {'room' : Room};
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

		app.setRpc('area', 	{
			proxyRemote : {
				invokeAreaServer: sinon.spy(function(serverId, method, args, cb){
					var matched = false;
					app.remoteApps.forEach(function(app){
						if(app.getServerId() === serverId){
							if(matched){
								return;
							}
							matched = true;
							Q.fcall(function(){
								return app.areaServer[method].apply(app.areaServer, args);
							})
							.catch(cb)
							.then(function(ret){
								cb(null, ret);
							});
						}
					});
					if(!matched){
						cb(null);
					}
				})
			}
		});

		app.setRpc('autoscaling', {
			reportRemote : {
				reportServerStatus: sinon.spy(function(route, serverId, loadAve, cb){
					cb();
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
