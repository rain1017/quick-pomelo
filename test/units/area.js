'use strict';

var env = require('../env');
var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('area test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('create/remove/join/quit/login/logout/notify player', function(cb){
		var connectorId = 'connector-server-1';
		var areaId = 'area1';
		var playerId = 'player1';

		var app1 = env.createMockApp('server1', 'area');
		var app2 = env.createMockApp('server2', 'area');

		Q.fcall(function(){
			return Q.all([Q.ninvoke(app1, 'start'), Q.ninvoke(app2, 'start')]);
		}).then(function(){
			return app1.areaBackend.createArea({_id : areaId}, 'room');
		}).then(function(){
			return app1.areaProxy.joinServer(areaId, 'server1');
		}).then(function(){
			return app1.playerBackend.createPlayer({_id : playerId});
		}).then(function(){
			return app1.playerProxy.joinArea(playerId, areaId);
		}).then(function(){
			return app1.playerProxy.invokePlayer(playerId, 'login', [connectorId]);
		}).then(function(){
			return app1.playerProxy.invokePlayer(playerId, 'notify', ['route', 'should in server1']);
		}).then(function(){
			return app1.areaProxy.quitServer(areaId);
		}).then(function(){
			return app2.areaProxy.joinServer(areaId, 'server2');
		}).then(function(){
			//Should work after area transfer to another server
			return app2.playerProxy.invokePlayer(playerId, 'notify', ['route', 'should in server2']);
		}).then(function(){
			return app2.playerProxy.invokePlayer(playerId, 'logout');
		}).then(function(){
			return app2.playerBackend.removePlayer(playerId);
		}).then(function(){
			return app2.areaBackend.removeArea(areaId);
		}).done(function(){
			Q.all([Q.ninvoke(app1, 'stop'), Q.ninvoke(app2, 'stop')]).then(function(){
				cb();
			});
		});
	});

	it('sync acquired player', function(cb){
		var serverId = 'area-server-1';
		var areaId = 'area1';
		var app = env.createMockApp(serverId, 'area');

		Q.nfcall(function(cb){
			return app.start(cb);
		}).then(function(){
			return app.areaBackend.createArea({_id : areaId}, 'room');
		}).then(function(){
			return app.areaProxy.joinServer(areaId, serverId);
		}).then(function(){
			return app.playerBackend.createPlayer({_id : 'player1'});
		}).then(function(){
			return app.playerBackend.createPlayer({_id : 'player2'});
		}).then(function(){
			return app.playerProxy.joinArea('player1', areaId);
		}).then(function(){
			return app.playerBackend.acquirePlayer('player2', areaId);
		}).then(function(){
			return app.playerBackend.releasePlayer('player1', areaId);
		}).then(function(){
			return app.areaProxy.invokeArea(areaId, 'syncAcquiredPlayers');
		}).then(function(){
			return app.areaProxy.invokeArea(areaId, 'hasPlayer', ['player1']).then(function(ret){
				ret.should.be.false;
			});
		}).then(function(){
			return app.playerBackend.getPlayerOwnerId('player2').then(function(ret){
				(ret === null).should.be.true;
			});
		}).done(function(){
			app.stop(cb);
		});
	});
});
