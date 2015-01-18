'use strict';

var should = require('should');
var redis = require('redis');
var Q = require('q');
Q.longStackSupport = true;

var redisConfig = require('../../config/test/redis');
var Area2Server = require('../../app/components/area2server');

describe('area2server test', function(){
	before(function(){
		this.db = redis.createClient(redisConfig.port, redisConfig.host);
	});

	beforeEach(function(cb){
		this.db.flushdb(cb);
	});

	it('add/get/update/remove', function(cb){
		var area2server = new Area2Server({db : this.db});

		Q.nfcall(function(cb){
			area2server.on('join:server1', function(areaId){
				console.log('%s join server1', areaId);
				areaId.should.equal('area1');
			});
			area2server.on('quit:server1', function(areaId){
				console.log('%s quit server1', areaId);
				areaId.should.equal('area1');
			});
			area2server.on('join:', function(areaId){
				console.log('%s join ""', areaId);
			});
			area2server.on('quit:', function(areaId){
				console.log('%s quit ""', areaId);
			});
			setTimeout(cb, 10);
		}).then(function(){
			return area2server.add('area1');
		}).then(function(){
			return area2server.get('area1').then(function(ret){
				ret.should.equal('');
			});
		}).then(function(){
			return area2server.update('area1', 'server1');
		}).then(function(){
			return area2server.get('area1').then(function(ret){
				ret.should.equal('server1');
			});
		}).then(function(){
			return area2server.getAreasByServer('server1').then(function(ret){
				ret.should.eql(['area1']);
			});
		}).then(function(){
			return area2server.remove('area1');
		}).then(function(){
			return area2server.get('area1').then(function(ret){
				(ret === null).should.equal(true);
			});
		}).done(cb);
	});

	after(function(cb){
		this.db.flushdb(cb);
	});
});
