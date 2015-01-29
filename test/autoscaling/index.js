'use strict';

var env = require('../env');
var _ = require('lodash');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('test', __filename);

var SCALE_INTERVAL = 1 * 1000;
var REPORT_TIMEOUT = 3 * 1000;
var ASSIGN_LIMIT = 10;
var RELEASE_LIMIT = 10;

describe('autoscaling test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('auto scale', function(cb){
		this.timeout(10 * 1000);

		var app1 = env.createMockApp('server1', 'area');
		var app2 = env.createMockApp('server2', 'area');

		var opts = {
			'autoScaling' : {
				scaleInterval : SCALE_INTERVAL,
				reportTimeout : REPORT_TIMEOUT,
				assignLimit : ASSIGN_LIMIT,
				releaseLimit : RELEASE_LIMIT,
			}
		};
		var app = env.createMockApp('server-autoscaling', 'autoscaling', opts);
		app.setRemoteApps([app1, app2]);

		var areaIds = ['area1', 'area2'];

		Q.fcall(function(){
			return Q.all([Q.ninvoke(app1, 'start'),
							Q.ninvoke(app2, 'start'),
							Q.ninvoke(app, 'start')]);
		}).then(function(){
			//Create several areas
			return Q.all(areaIds.map(function(areaId){
				return app.areaManager.createArea(areaId);
			}));
		}).then(function(){
			//Add two servers
			return Q.all([
					app.autoScaling.reportServerStatus('server1', 0.1),
					app.autoScaling.reportServerStatus('server2', 0.2)
					]);
		}).delay(SCALE_INTERVAL + 500).then(function(){
			//Areas should be loaded to server1
			return app1.areaManager.getAcquiredAreaIds().then(function(ret){
				ret.should.eql(areaIds);
			});
		}).then(function(){
			//Set server1's loadave to exceed limit
			return Q.all([
					app.autoScaling.reportServerStatus('server1', 0.99),
					app.autoScaling.reportServerStatus('server2', 0.2)
					]);
		}).delay(SCALE_INTERVAL + 500).then(function(){
			//Areas should be moved to server2
			return app2.areaManager.getAcquiredAreaIds().then(function(ret){
				ret.should.eql(areaIds);
			});
		}).then(function(){
			//set server1 loadave to low value
			return app.autoScaling.reportServerStatus('server1', 0.3);
		}).delay(REPORT_TIMEOUT - 500).then(function(){
			//server2 heart beat timeout, should be disconnected
			//areas should be moved to server1
			return app1.areaManager.getAcquiredAreaIds().then(function(ret){
				ret.should.eql(areaIds);
			});
		}).done(function(){
			Q.all([Q.ninvoke(app1, 'stop'),
							Q.ninvoke(app2, 'stop'),
							Q.ninvoke(app, 'stop')])
			.then(function(){
				cb();
			});
		});
	});

});
