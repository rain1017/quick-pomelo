'use strict';

var env = require('../env');
var Q = require('q');
var sinon = require('sinon');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('areaManager test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('createArea/removeArea/acquireArea', function(cb){
		var serverId = 'server1';
		var areaId = 'area1';

		var app = env.createMockApp(serverId, 'area');

		Q.nfcall(function(cb){
			app.start(cb);
		}).then(function(){
			app.areaManager.on('server:' + serverId + ':join', function(ret){
				logger.debug('server:' + serverId + ':join %s', ret);
				ret.should.equal(areaId);
			});
			app.areaManager.on('server:' + serverId + ':quit', function(ret){
				logger.debug('server:' + serverId + ':quit %s', ret);
				ret.should.equal(areaId);
			});
			app.areaManager.on('area:area1:update', function(ret){
				logger.debug('area:area1:update %s', ret);
			});
			app.areaManager.on('area:area1:remove', function(){
				logger.debug('area:area1:remove');
			});
		}).delay(10).then(function(){
			return app.areaManager.createArea(areaId);
		}).then(function(){
			return app.areaManager.getAreaOwnerId(areaId).then(function(ret){
				(ret === null).should.equal(true);
			});
		}).then(function(){
			return app.areaManager.acquireArea(areaId);
		}).then(function(){
			return app.areaManager.getAreaOwnerId(areaId).then(function(ret){
				ret.should.equal(serverId);
			});
		}).then(function(){
			return app.areaManager.getAcquiredAreaIds().then(function(ret){
				ret.should.eql([areaId]);
			});
		}).then(function(){
			return app.areaManager.releaseArea(areaId);
		}).then(function(){
			return app.areaManager.getAreaOwnerId(areaId).then(function(ret){
				(ret === null).should.be.true;
			});
		}).then(function(){
			return app.areaManager.removeArea(areaId);
		}).delay(10)
		.done(function(){
			app.stop(cb);
		});
	});

	it('invoke areaServer', function(cb){
		var app = env.createMockApp('server1', 'area');
		var areaManager = null;
		var areaServer = null;

		var method = 'testInvoke';
		var args = ['arg1', 'arg2'];

		Q.nfcall(function(cb){
			return app.start(cb);
		}).then(function(){
			app.areaServer[method] = sinon.spy(function(){return 'ret';});
		}).then(function(){
			return app.areaManager.invokeAreaServer('server1', method, args).then(function(ret){
				ret.should.equal('ret');
				app.areaServer[method].calledWith.apply(app.areaServer[method], args).should.be.true;
			});
		}).then(function(cb){
			return app.areaManager.invokeAreaServer('server2', method, args).then(function(){
				app.rpc.area.proxyRemote.invokeAreaServer.calledWith('server2', method, args).should.be.true;
			});
		}).done(function(){
			app.stop(cb);
		});
	});
});
