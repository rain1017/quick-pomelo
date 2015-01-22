'use strict';

var env = require('../env');
var Q = require('q');
var sinon = require('sinon');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('areaManager test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('createArea/removeArea/acquireArea', function(cb){
		var serverId = 'server1';
		var areaId = 'area1';

		var app = env.createMockApp({serverId : serverId});
		var areaManager = app.get('areaManager');

		Q.nfcall(function(cb){
			areaManager.on('server:' + serverId + ':join', function(ret){
				logger.debug('server:' + serverId + ':join %s', ret);
				ret.should.equal(areaId);
			});
			areaManager.on('server:' + serverId + ':quit', function(ret){
				logger.debug('server:' + serverId + ':quit %s', ret);
				ret.should.equal(areaId);
			});
			areaManager.on('area:area1:update', function(ret){
				logger.debug('area:area1:update %s', ret);
			});
			areaManager.on('area:area1:remove', function(){
				logger.debug('area:area1:remove');
			});
			setTimeout(cb, 10);
		}).then(function(){
			return areaManager.createArea(areaId, {});
		}).then(function(){
			return areaManager.getAreaOwnerId(areaId).then(function(ret){
				(ret === null).should.equal(true);
			});
		}).then(function(){
			return areaManager.acquireArea(areaId);
		}).then(function(){
			return areaManager.getAreaOwnerId(areaId).then(function(ret){
				ret.should.equal(serverId);
			});
		}).then(function(){
			return areaManager.getAcquiredAreaIds().then(function(ret){
				ret.should.eql([areaId]);
			});
		}).then(function(){
			return areaManager.releaseArea(areaId);
		}).then(function(){
			return areaManager.getAreaOwnerId(areaId).then(function(ret){
				(ret === null).should.be.true;
			});
		}).then(function(){
			return areaManager.removeArea(areaId);
		}).delay(10)
		.done(function(){
			app.close();
			cb();
		});
	});

	it('invoke areaServer', function(cb){
		var app = env.createMockApp({serverId : 'server1'});
		var areaManager = app.get('areaManager');
		var areaServer = app.get('areaServer');

		var method = 'testInvoke';
		var args = ['arg1', 'arg2'];
		areaServer[method] = sinon.spy(function(){return 'ret';});

		Q.fcall(function(){
			return areaManager.invokeAreaServer('server1', method, args).then(function(ret){
				ret.should.equal('ret');
				areaServer[method].calledWith.apply(areaServer[method], args).should.be.true;
			});
		}).then(function(cb){
			return areaManager.invokeAreaServer('server2', method, args).then(function(){
				app.rpc.area.proxyRemote.invokeAreaServer.calledWith('server2', method, args).should.be.true;
			});
		}).done(function(){
			app.close();
			cb();
		});
	});
});
