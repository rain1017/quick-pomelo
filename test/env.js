'use strict';

var should = require('should');
var Q = require('q');
var _ = require('lodash');
var redis = require('redis');
var mongoose = require('mongoose');
var sinon = require('sinon');
var logger = require('pomelo-logger').getLogger('test', __filename);
var quick = require('../lib');
var MockApp = require('./mockapp');

var redisConfig = {host : '127.0.0.1', port : 6379};
var mongoConfig = {uri: 'mongodb://localhost/quick-pomelo-test', options : {}};

Q.longStackSupport = true;

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
		areaManagerOpts.host = redisConfig.host;
		areaManagerOpts.port = redisConfig.port;
		app.load(quick.components.areaManager, areaManagerOpts);

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
							}).catch(function(e){
								cb(e);
							}).then(function(ret){
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
		mongoose.connect(mongoConfig.uri, mongoConfig.options);
		this.redisClient = redis.createClient(redisConfig.port, redisConfig.host);
	},

	beforeEach : function(){
		mongoose.connection.db.dropDatabase();
		this.redisClient.flushdb();
	},

	afterEach : function(){

	},

	after : function(){
		mongoose.connection.db.dropDatabase();
		mongoose.disconnect();
		this.redisClient.flushdb();
		this.redisClient.end();
	},
};

module.exports = env;
