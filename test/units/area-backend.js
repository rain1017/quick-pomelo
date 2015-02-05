'use strict';

var env = require('../env');
var Q = require('q');
var sinon = require('sinon');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('areaBackend test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('create/acquire/release Area', function(cb){
		var serverId = 'server1';
		var areaId = 'area1';

		var app = env.createMockApp(serverId, 'area');

		Q.nfcall(function(cb){
			app.start(cb);
		}).then(function(){
			app.areaBackend.on('server:' + serverId + ':join', function(ret){
				logger.debug('server:' + serverId + ':join %s', ret);
				ret.should.equal(areaId);
			});
			app.areaBackend.on('server:' + serverId + ':quit', function(ret){
				logger.debug('server:' + serverId + ':quit %s', ret);
				ret.should.equal(areaId);
			});
			app.areaBackend.on('area:area1:update', function(ret){
				logger.debug('area:area1:update %s', ret);
			});
			app.areaBackend.on('area:area1:remove', function(){
				logger.debug('area:area1:remove');
			});
		}).delay(10).then(function(){
			return app.areaBackend.createArea({_id : areaId}, 'room');
		}).then(function(){
			return app.areaBackend.getAreaOwnerId(areaId).then(function(ret){
				(ret === null).should.equal(true);
			});
		}).then(function(){
			return app.areaBackend.acquireArea(areaId);
		}).then(function(){
			return app.areaBackend.getAreaOwnerId(areaId).then(function(ret){
				ret.should.equal(serverId);
			});
		}).then(function(){
			return app.areaBackend.getAcquiredAreaIds().then(function(ret){
				ret.should.eql([areaId]);
			});
		}).then(function(){
			return app.areaBackend.releaseArea(areaId);
		}).then(function(){
			return app.areaBackend.getAreaOwnerId(areaId).then(function(ret){
				(ret === null).should.be.true;
			});
		}).done(function(){
			app.stop(cb);
		});
	});
});

