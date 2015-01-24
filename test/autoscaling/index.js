'use strict';

var env = require('../env');
var _ = require('lodash');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('test', __filename);

var SCALE_INTERVAL = 2 * 1000;
var REPORT_TIMEOUT = 5 * 1000;
var ASSIGN_LIMIT = 10;
var RELEASE_LIMIT = 10;

describe('autoscaling test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('auto scale', function(cb){
		this.timeout(30 * 1000);

		var app1 = env.createMockApp({serverId : 'server1'});
		var app2 = env.createMockApp({serverId : 'server2'});

		var app = env.createMockApp({
								serverId : 'autoscaling',
								components : ['autoScaling', 'areaManager']
							});

		app.set('autoScalingConfig', {
			scaleInterval : SCALE_INTERVAL,
			reportTimeout : REPORT_TIMEOUT,
			assignLimit : ASSIGN_LIMIT,
			releaseLimit : RELEASE_LIMIT,
		});
		app.setRemoteApps([app1, app2]);

		var autoScaling = null;
		var areaManager = null;

		var areaIds = ['area1', 'area2'];

		Q.fcall(function(){
			return Q.all([app1.init(), app2.init(), app.init()]);
		}).then(function(){
			autoScaling = app.get('autoScaling');
			areaManager = app.get('areaManager');
		}).then(function(){
			//Create several areas
			return Q.all(areaIds.map(function(areaId){
				return areaManager.createArea(areaId);
			}));
		}).then(function(){
			//Add two servers
			return Q.all([
					autoScaling.reportServerStatus('server1', 0.1),
					autoScaling.reportServerStatus('server2', 0.2)
					]);
		}).delay(SCALE_INTERVAL + 1000).then(function(){
			//Areas should be loaded to server1
			return app1.get('areaManager').getAcquiredAreaIds().then(function(ret){
				ret.should.eql(areaIds);
			});
		}).then(function(){
			//Set server1's loadave to exceed limit
			return Q.all([
					autoScaling.reportServerStatus('server1', 0.99),
					autoScaling.reportServerStatus('server2', 0.2)
					]);
		}).delay(SCALE_INTERVAL + 1000).then(function(){
			//Areas should be moved to server2
			return app2.get('areaManager').getAcquiredAreaIds().then(function(ret){
				ret.should.eql(areaIds);
			});
		}).then(function(){
			//set server1 loadave to low value
			return autoScaling.reportServerStatus('server1', 0.3);
		}).delay(REPORT_TIMEOUT - 1000).then(function(){
			//server2 heart beat timeout, should be disconnected
			//areas should be moved to server1
			return app1.get('areaManager').getAcquiredAreaIds().then(function(ret){
				ret.should.eql(areaIds);
			});
		}).done(function(){
			Q.allSettled([app.close(), app1.close(), app2.close()]).then(function(){
				cb();
			});
		});
	});

});
