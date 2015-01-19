'use strict';

var should = require('should');
var sinon = require('sinon');
var redis = require('redis');
var redisConfig = require('../../config/test/redis');
var Area2Server = require('../../app/components/area2server');
var AreaProxy = require('../../app/components/area-proxy');
var Q = require('q');
Q.longStackSupport = true;
var logger = require('pomelo-logger').getLogger('test', __filename);


describe('area-proxy test', function(){
	before(function(){
		this.db = redis.createClient(redisConfig.port, redisConfig.host);
	});

	beforeEach(function(cb){
		this.db.flushdb(cb);
	});

	it('areaProxy test', function(cb){
		var fakeAreaServer = {
			invokeArea : sinon.spy()
		};
		var fakeApp = {
			rpc : {	area :
				{ proxyRemote :
					{ invokeArea: sinon.spy(function(serverId, areaId, method, opts, cb){
							cb(null);
						})}
				}
			},
			getServerId : function(){
				return 'server1';
			},
		};
		var area2server = new Area2Server({db : this.db});
		var areaProxy = new AreaProxy({
								app : fakeApp,
								areaServer : fakeAreaServer,
								area2server : area2server
						});


		Q.fcall(function(){
			return area2server.add('area1');
		}).then(function(){
			return area2server.update('area1', 'server1');
		}).delay(10).then(function(){
			return areaProxy.invoke('area1', 'method', 'opts').then(function(){
				fakeAreaServer.invokeArea.calledWith('area1', 'method', 'opts').should.be.true;
			});
		}).then(function(){
			return area2server.update('area1', 'server2');
		}).delay(10).then(function(cb){
			return areaProxy.invoke('area1', 'method', 'opts').then(function(){
				fakeApp.rpc.area.proxyRemote.invokeArea.calledWith('server2', 'area1', 'method', 'opts').should.be.true;
			});
		})
		.done(cb);
	});

	after(function(cb){
		this.db.flushdb(cb);
	});
});
