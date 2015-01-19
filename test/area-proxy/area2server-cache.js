'use strict';
var should = require('should');
var redis = require('redis');
var redisConfig = require('../../config/test/redis');
var Area2ServerCache = require('../../app/components/area-proxy/area2server-cache');
var Area2Server = require('../../app/components/area2server');
var Q = require('q');
Q.longStackSupport = true;
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('area2server-cache test', function(){
	before(function(){
		this.db = redis.createClient(redisConfig.port, redisConfig.host);
	});

	beforeEach(function(cb){
		this.db.flushdb(cb);
	});

	it('get/expire test', function(cb){
		var area2server = new Area2Server({db : this.db});
		var cache = new Area2ServerCache({
									area2server : area2server,
									timeout : 50
								});
		Q.fcall(function(){
			return area2server.add('area1');
		}).then(function(){
			return cache.get('area1').then(function(ret){
				ret.should.equal('');
			});
		}).then(function(){
			return area2server.update('area1', 'server1');
		}).delay(20) //Wait for data sync
		.then(function(){
			return cache.get('area1').then(function(ret){
				ret.should.equal('server1');
			});
		}).delay(100) //Wait for cache expire
		.then(function(){
			return cache.get('area1').then(function(ret){
				ret.should.equal('server1');
			});
		}).then(function(){
			return area2server.remove('area1');
		}).delay(20)
		.then(function(){
			return cache.get('area1').then(function(ret){
				(ret === null).should.equal(true);
			});
		}).done(cb);
	});

	after(function(cb){
		this.db.flushdb(cb);
	});
});
