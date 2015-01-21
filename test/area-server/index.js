'use strict';

var env = require('../env');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('test', __filename);

var AreaManager = require('../../app/components/area-manager');
var AreaServer = require('../../app/components/area-server');

var fakeApp = {
	getServerId : function(){return 'server1';}
};

describe('areaServer test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('join/quit', function(cb){
		var areaManager = new AreaManager({redisConfig : env.redisConfig});
		var areaServer = new AreaServer({
			areaManager : areaManager,
			app : fakeApp,
		});

		Q.fcall(function(){
			areaServer.init();
		}).then(function(){
			return areaManager.createArea({'_id' : 'area1'});
		}).then(function(){
			return areaServer.join('area1');
		}).then(function(){
			return areaServer.invokeArea('area1', 'method', 'opts');
		}).then(function(){
			return areaServer.quit('area1');
		}).done(function(){
			areaServer.close();
			cb();
		});
	});

	it('sync acquired area', function(cb){
		var areaManager = new AreaManager({redisConfig : env.redisConfig});
		var areaServer = new AreaServer({
			areaManager : areaManager,
			app : fakeApp,
		});

		Q.fcall(function(){
			areaServer.init();
		}).then(function(){
			return areaManager.createArea({'_id' : 'area1'});
		}).then(function(){
			return areaManager.createArea({'_id' : 'area2'});
		}).then(function(){
			return areaServer.join('area1');
		}).then(function(){
			return areaManager.acquireArea('area2', 'server1');
		}).then(function(){
			return areaManager.releaseAreaForce('area1');
		}).then(function(){
			return areaServer.syncAcquiredAreas();
		}).then(function(){
			areaServer.isLoaded('area1').should.be.false;
			return areaManager.getAreaOwnerId('area2').then(function(ret){
				(ret === null).should.be.true;
			});
		}).done(function(){
			areaManager.close();
			areaServer.close();
			cb();
		});
	});
});
