'use strict';

var env = require('../env');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('test', __filename);

var AreaManager = require('../../app/components/area-manager');

describe('areaManager test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('createArea/removeArea/acquireArea', function(cb){
		var areaManager = new AreaManager({redisConfig : env.redisConfig});

		Q.nfcall(function(cb){
			areaManager.on('server:server1:join', function(areaId){
				logger.debug('server:server1:join %s', areaId);
				areaId.should.equal('area1');
			});
			areaManager.on('server:server1:quit', function(areaId){
				logger.debug('server:server1:quit %s', areaId);
				areaId.should.equal('area1');
			});
			areaManager.on('area:area1:update', function(serverId){
				logger.debug('area:area1:update %s', serverId);
			});
			areaManager.on('area:area1:remove', function(){
				logger.debug('area:area1:remove');
			});
			setTimeout(cb, 10);
		}).then(function(){
			return areaManager.createArea('area1', {});
		}).then(function(){
			return areaManager.getAreaOwnerId('area1').then(function(ret){
				(ret === null).should.equal(true);
			});
		}).then(function(){
			return areaManager.acquireArea('area1', 'server1');
		}).then(function(){
			return areaManager.getAreaOwnerId('area1').then(function(ret){
				ret.should.equal('server1');
			});
		}).then(function(){
			return areaManager.getAcquiredAreaIds('server1').then(function(ret){
				ret.should.eql(['area1']);
			});
		}).then(function(){
			return areaManager.releaseArea('area1', 'server1');
		}).then(function(){
			return areaManager.getAreaOwnerId('area1').then(function(ret){
				(ret === null).should.be.true;
			});
		}).then(function(){
			return areaManager.removeArea('area1');
		}).delay(10)
		.done(function(){
			areaManager.close();
			cb();
		});
	});
});
