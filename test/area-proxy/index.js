'use strict';

var env = require('../env');
var Q = require('q');
var sinon = require('sinon');
var logger = require('pomelo-logger').getLogger('test', __filename);

var AreaManager = require('../../app/components/area-manager');
var AreaProxy = require('../../app/components/area-proxy');

describe('area-proxy test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('areaProxy test', function(cb){
		var fakeAreaServer = {
			invokeArea : sinon.spy()
		};
		var fakeApp = {
			rpc : {	area :
				{ proxyRemote :
					{ invokeArea: sinon.spy(function(serverId, areaId, method, opts, cb){
							cb(null);
						})}
				}
			},
			getServerId : function(){
				return 'server1';
			},
		};
		var areaManager = new AreaManager({redisConfig : env.redisConfig});
		var areaProxy = new AreaProxy({
								app : fakeApp,
								areaServer : fakeAreaServer,
								areaManager : areaManager
						});


		Q.fcall(function(){
			return areaManager.createArea('area1');
		}).then(function(){
			return areaManager.updateServerId('area1', 'server1');
		}).delay(10).then(function(){
			return areaProxy.invoke('area1', 'method', 'opts').then(function(){
				fakeAreaServer.invokeArea.calledWith('area1', 'method', 'opts').should.be.true;
			});
		}).then(function(){
			return areaManager.updateServerId('area1', 'server2');
		}).delay(10).then(function(cb){
			return areaProxy.invoke('area1', 'method', 'opts').then(function(){
				fakeApp.rpc.area.proxyRemote.invokeArea.calledWith('server2', 'area1', 'method', 'opts').should.be.true;
			});
		})
		.done(cb);
	});
});
