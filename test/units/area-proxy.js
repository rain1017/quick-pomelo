'use strict';

var env = require('../env');
var Q = require('q');
var sinon = require('sinon');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('areaProxy test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('area proxy test', function(cb){
		var app = env.createMockApp('server1', 'area');

		var method = 'testInvoke';
		var args = ['arg1', 'arg2'];

		Q.nfcall(function(cb){
			return app.start(cb);
		}).then(function(){
			app.areaServer[method] = sinon.spy(function(){return 'ret';});
		}).then(function(){
			return app.areaProxy.invokeAreaServer('server1', method, args).then(function(ret){
				ret.should.equal('ret');
				app.areaServer[method].calledWith.apply(app.areaServer[method], args).should.be.true;
			});
		}).then(function(cb){
			return app.areaProxy.invokeAreaServer('server2', method, args).then(function(){
				app.rpc.area.quickRemote.invokeAreaServer.calledWith('server2', method, args).should.be.true;
			});
		}).done(function(){
			app.stop(cb);
		});
	});
});

describe('index-cache test', function(){

	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('get/expire test', function(cb){
		var serverId = 'server1', areaId = 'area1';

		var opts = {
			'areaProxy' : {cacheTimeout : 50}
		};
		var app = env.createMockApp(serverId, 'area', opts);

		Q.nfcall(function(cb){
			return app.start(cb);
		}).then(function(){
			return app.areaBackend.createArea({_id : areaId}, 'room');
		}).then(function(){
			return app.areaProxy.indexCache.get(areaId).then(function(ret){
				(ret === null).should.be.true;
			});
		}).then(function(){
			return app.areaBackend.acquireArea(areaId);
		}).delay(20) //Wait for cache sync
		.then(function(){
			return app.areaProxy.indexCache.get(areaId).then(function(ret){
				ret.should.equal(serverId);
			});
		}).delay(100) //Wait for cache expire
		.then(function(){
			return app.areaProxy.indexCache.get(areaId).then(function(ret){
				ret.should.equal(serverId);
			});
		}).then(function(){
			return app.areaBackend.releaseArea(areaId);
		}).delay(20) //Wait for cache sync
		.then(function(){
			return app.areaProxy.indexCache.get(areaId).then(function(ret){
				(ret === null).should.be.true;
			});
		}).done(function(){
			app.stop(cb);
		});
	});
});
