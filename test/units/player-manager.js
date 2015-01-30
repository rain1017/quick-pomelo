'use strict';

var env = require('../env');
var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('playerManager test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('create/remove/acquire player', function(cb){
		var serverId = 'area-server-1';
		var areaId = 'area1';
		var playerId = 'player1';

		var app = env.createMockApp(serverId, 'area');

		Q.nfcall(function(cb){
			app.start(cb);
		}).then(function(){
			return app.playerManager.createPlayer(playerId);
		}).then(function(){
			return app.playerManager.acquirePlayer(playerId, areaId);
		}).then(function(){
			return app.playerManager.getPlayerOwnerId(playerId).then(function(ret){
				ret.should.equal(areaId);
			});
		}).then(function(){
			return app.playerManager.getAcquiredPlayerIds(areaId).then(function(ret){
				ret.should.eql([playerId]);
			});
		}).then(function(){
			return app.playerManager.releasePlayer(playerId, areaId);
		}).then(function(){
			return app.playerManager.getPlayerOwnerId(playerId).then(function(ret){
				(ret === null).should.be.true;
			});
		}).then(function(){
			return app.playerManager.removePlayer(playerId);
		}).done(function(){
			app.stop(cb);
		});
	});
});
