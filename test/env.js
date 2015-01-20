'use strict';

var should = require('should');
var Q = require('q');
var redis = require('redis');
var mongoose = require('mongoose');

var redisConfig = require('../config/test/redis');
var mongoConfig = require('../config/test/mongodb');

Q.longStackSupport = true;

module.exports = {

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

	mongoConfig : mongoConfig,
	redisConfig : redisConfig
};
