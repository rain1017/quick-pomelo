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
		var app = env.createMockApp(serverId, 'area');

		Q.nfcall(function(cb){
			app.start(cb);
		}).then(function(){
			return app.areaManager.createArea({'_id' : areaId});
		}).then(function(){
			return app.areaServer.join(areaId);
		}).then(function(){
			return app.areaServer.isLoaded(areaId).should.be.true;
		}).then(function(){
			return app.areaServer.quit(areaId);
		}).done(function(){
			app.stop(cb);
		});
	});

	it('sync acquired area', function(cb){
		var serverId = 'server1';
		var app = env.createMockApp(serverId, 'area');

		Q.nfcall(function(cb){
			return app.start(cb);
		}).then(function(){
			return app.areaManager.createArea({'_id' : 'area1'});
		}).then(function(){
			return app.areaManager.createArea({'_id' : 'area2'});
		}).then(function(){
			return app.areaServer.join('area1');
		}).then(function(){
			return app.areaManager.acquireArea('area2');
		}).then(function(){
			return app.areaManager.releaseAreaForce('area1');
		}).then(function(){
			return app.areaServer.syncAcquiredAreas();
		}).then(function(){
			app.areaServer.isLoaded('area1').should.be.false;
			return app.areaManager.getAreaOwnerId('area2').then(function(ret){
				(ret === null).should.be.true;
			});
		}).done(function(){
			app.stop(cb);
		});
	});

	it('reportStatus', function(cb){
		var app = env.createMockApp('server1', 'area');

		Q.nfcall(function(cb){
			return app.start(cb);
		}).delay(100).then(function(){
			return app.areaServer.getLoadAverage();
		}).then(function(loadAve){
			(loadAve <= 1.0 && loadAve >= 0.0).should.be.true;
			logger.info('Load Average = %s', loadAve);
		}).done(function(){
			app.stop(cb);
		});
	});
});
