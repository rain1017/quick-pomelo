'use strict';

var should = require('should');
var Q = require('q');
var redis = require('redis');
var mongoose = require('mongoose');
var sinon = require('sinon');
var logger = require('pomelo-logger').getLogger('test', __filename);

var redisConfig = require('../config/test/redis');
var mongoConfig = require('../config/test/mongodb');

var AreaManager = require('../app/components/area-manager');
var AreaServer = require('../app/components/area-server');

Q.longStackSupport = true;

var MockApp = function(opts){
	this.serverId = opts.serverId;
	this.components = {};

	this.loadComponents(opts);
};

MockApp.prototype.loadComponents = function(opts){
	var areaManager = new AreaManager({redisConfig : redisConfig, app : this, cacheTimeout : opts.cacheTimeout});
	var areaServer = new AreaServer({app : this});
	this.addComponent('areaManager', areaManager);
	this.addComponent('areaServer', areaServer);
};

MockApp.prototype.getServerId = function(){
	return this.serverId;
};

MockApp.prototype.addComponent = function(name, component){
	this.components[name] = component;
};

MockApp.prototype.get = function(name){
	return this.components[name];
};

MockApp.prototype.rpc = {
	area :
		{ proxyRemote :
			{
				invokeAreaServer: sinon.spy(function(serverId, method, args, cb){cb(null);})
			}
		}
};

MockApp.prototype.close = function(){
	this.get('areaManager').close();
	this.get('areaServer').close();
};

module.exports = {

	createMockApp : function(opts){
		return new MockApp(opts);
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
