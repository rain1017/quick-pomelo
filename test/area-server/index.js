'use strict';

var env = require('../env');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('areaServer test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('join/quit', function(cb){
		var serverId = 'server1', areaId = 'area1';
		var app = env.createMockApp({serverId : serverId});
		var areaServer = null;
		var areaManager = null;

		Q.fcall(function(){
			return app.init();
		}).then(function(){
			areaServer = app.get('areaServer');
			areaManager = app.get('areaManager');
		}).then(function(){
			return areaManager.createArea({'_id' : areaId});
		}).then(function(){
			return areaServer.join(areaId);
		}).then(function(){
			return areaServer.isLoaded(areaId).should.be.true;
		}).then(function(){
			return areaServer.quit(areaId);
		}).done(function(){
			app.close().then(function(){
				cb(null);
			});
		});
	});

	it('sync acquired area', function(cb){
		var serverId = 'server1';
		var app = env.createMockApp({serverId : serverId});
		var areaServer = null;
		var areaManager = null;

		Q.fcall(function(){
			return app.init();
		}).then(function(){
			areaServer = app.get('areaServer');
			areaManager = app.get('areaManager');
		}).then(function(){
			return areaManager.createArea({'_id' : 'area1'});
		}).then(function(){
			return areaManager.createArea({'_id' : 'area2'});
		}).then(function(){
			return areaServer.join('area1');
		}).then(function(){
			return areaManager.acquireArea('area2');
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
			app.close().then(function(){
				cb(null);
			});
		});
	});

	it('reportStatus', function(cb){
		var app = env.createMockApp({serverId : 'server1'});

		Q.fcall(function(){
			return app.init();
		}).delay(100).then(function(){
			return app.get('areaServer').getLoadAverage();
		}).then(function(loadAve){
			(loadAve <= 1.0 && loadAve >= 0.0).should.be.true;
			logger.info('Load Average = %s', loadAve);
		}).done(function(){
			app.close().then(function(){
				cb(null);
			});
		});
	});
});
