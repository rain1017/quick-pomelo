'use strict';

var env = require('../env');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('index-cache test', function(){

	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('get/expire test', function(cb){
		var serverId = 'server1', areaId = 'area1';

		var opts = {
			'areaManager' : {cacheTimeout : 50}
		};
		var app = env.createMockApp(serverId, 'area', opts);

		Q.nfcall(function(cb){
			return app.start(cb);
		}).then(function(){
			return app.areaManager.createArea(areaId);
		}).then(function(){
			return app.areaManager.indexCache.get(areaId).then(function(ret){
				(ret === null).should.be.true;
			});
		}).then(function(){
			return app.areaManager.acquireArea(areaId);
		}).delay(20) //Wait for data sync
		.then(function(){
			return app.areaManager.indexCache.get(areaId).then(function(ret){
				ret.should.equal(serverId);
			});
		}).delay(100) //Wait for cache expire
		.then(function(){
			return app.areaManager.indexCache.get(areaId).then(function(ret){
				ret.should.equal(serverId);
			});
		}).then(function(){
			return app.areaManager.releaseArea(areaId);
		}).then(function(){
			return app.areaManager.removeArea(areaId);
		}).delay(20)
		.then(function(){
			return app.areaManager.indexCache.get(areaId).fail(function(e){
				//Error is expected
				logger.debug(e);
			});
		}).done(function(){
			app.stop(cb);
		});
	});
});
