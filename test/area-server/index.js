'use strict';

var should = require('should');
var redis = require('redis');
var logger = require('pomelo-logger').getLogger('test', __filename);
var Q = require('q');
Q.longStackSupport = true;

var redisConfig = require('../../config/test/redis');
var Area2Server = require('../../app/components/area2server');
var AreaServer = require('../../app/components/area-server');

describe('areaServer test', function(){
	before(function(){
		this.db = redis.createClient(redisConfig.port, redisConfig.host);
	});

	beforeEach(function(cb){
		this.db.flushdb(cb);
	});

	it('init/close', function(cb){
		var area2server = new Area2Server({db : this.db});
		var fakeApp = {
			getServerId : function(){return 'server1';}
		};

		var areaServer = new AreaServer({
			area2server : area2server,
			app : fakeApp,
		});

		areaServer.init();
		areaServer.close();
		cb(null);
	});

	after(function(cb){
		this.db.flushdb(cb);
	});
});
