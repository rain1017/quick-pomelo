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

	it('createArea/removeArea/updateServerId', function(cb){
		var areaManager = new AreaManager({redisConfig : env.redisConfig});

		Q.nfcall(function(cb){
			areaManager.on('server:server1:join', function(areaId){
				logger.debug('server:server1:join "%s"', areaId);
				areaId.should.equal('area1');
			});
			areaManager.on('server:server1:quit', function(areaId){
				logger.debug('server:server1:quit "%s"', areaId);
				areaId.should.equal('area1');
			});
			areaManager.on('server::join', function(areaId){
				logger.debug('server::join "%s"', areaId);
				areaId.should.equal('area1');
			});
			areaManager.on('server::quit', function(areaId){
				logger.debug('server::quit "%s"', areaId);
				areaId.should.equal('area1');
			});
			areaManager.on('area:area1:update', function(serverId){
				logger.debug('area:area1:update "%s"', serverId);
			});
			areaManager.on('area:area1:remove', function(){
				logger.debug('area:area1:remove');
			});
			setTimeout(cb, 10);
		}).then(function(){
			return areaManager.createArea('area1', {});
		}).then(function(){
			return areaManager.getServerIdByAreaId('area1').then(function(ret){
				ret.should.equal('');
			});
		}).then(function(){
			return areaManager.updateServerId('area1', 'server1');
		}).then(function(){
			return areaManager.getServerIdByAreaId('area1').then(function(ret){
				ret.should.equal('server1');
			});
		}).then(function(){
			return areaManager.getAreaIdsByServerId('server1').then(function(ret){
				ret.should.eql(['area1']);
			});
		}).then(function(){
			return areaManager.removeArea('area1');
		}).then(function(){
			return areaManager.getServerIdByAreaId('area1').then(function(ret){
				(ret === null).should.equal(true);
			});
		}).done(cb);
	});
});
