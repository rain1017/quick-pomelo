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

	it('join/quit/connect/disconnect/notify player', function(cb){
		var connectorId = 'connector-server-1';
		var areaId = 'area1';
		var playerId = 'player1';

		var app1 = env.createMockApp('server1', 'area');
		var app2 = env.createMockApp('server2', 'area');

		Q.fcall(function(cb){
			return Q.all([Q.ninvoke(app1, 'start'), Q.ninvoke(app2, 'start')]);
		}).then(function(){
			return app1.areaManager.createArea(areaId);
		}).then(function(){
			return app1.areaManager.joinServer(areaId, 'server1');
		}).then(function(){
			return app1.playerManager.createPlayer(playerId);
		}).then(function(){
			return app1.areaManager.invokeArea(areaId, 'join', [playerId]);
		}).then(function(){
			return app1.areaManager.invokeArea(areaId, 'connect', [playerId, connectorId]);
		}).then(function(){
			return app1.areaManager.invokeArea(areaId, 'notify', [playerId, 'route', 'should in server1']);
		}).then(function(){
			return app1.areaManager.quitServer(areaId);
		}).then(function(){
			return app2.areaManager.joinServer(areaId, 'server2');
		}).then(function(){
			//Should work after area transfer to another server
			return app2.areaManager.invokeArea(areaId, 'notify', [playerId, 'route', 'should in server2']);
		}).then(function(){
			return app2.areaManager.invokeArea(areaId, 'disconnect', [playerId]);
		}).then(function(){
			return app2.areaManager.invokeArea(areaId, 'quit', [playerId]);
		}).then(function(){
			return app2.playerManager.removePlayer(playerId);
		}).then(function(){
			return app2.areaManager.quitServer(areaId);
		}).delay(10).then(function(){
			return app2.areaManager.removeArea(areaId);
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
			return app.areaManager.createArea(areaId);
		}).then(function(){
			return app.areaManager.joinServer(areaId, serverId);
		}).then(function(){
			return app.playerManager.createPlayer('player1');
		}).then(function(){
			return app.playerManager.createPlayer('player2');
		}).then(function(){
			return app.areaManager.invokeArea(areaId, 'join', ['player1']);
		}).then(function(){
			return app.playerManager.acquirePlayer('player2', areaId);
		}).then(function(){
			return app.playerManager.releasePlayer('player1', areaId);
		}).then(function(){
			return app.areaManager.invokeArea(areaId, 'syncAcquiredPlayers');
		}).then(function(){
			return app.areaManager.invokeArea(areaId, 'hasPlayer', ['player1']).then(function(ret){
				ret.should.be.false;
			});
		}).then(function(){
			return app.playerManager.getPlayerOwnerId('player2').then(function(ret){
				(ret === null).should.be.true;
			});
		}).done(function(){
			app.stop(cb);
		});
	});
});
