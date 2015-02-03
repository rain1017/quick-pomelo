'use strict';

var env = require('../env');
var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('defaultarea test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('defaultarea', function(cb){
		var serverId = 'server1';
		var areaId = 'defaultarea1';

		var app = env.createMockApp('server1', 'area');
		var flush = 100, timeout = 300;

		Q.nfcall(function(cb){
			return app.start(cb);
		}).then(function(){
			return app.playerManager.createPlayer({_id : 'player1'});
		}).then(function(){
			return app.playerManager.createPlayer({_id : 'player2'});
		}).then(function(){
			var opts = {
				_id : areaId,
				_flush : flush,
				timeout : timeout,
				capacity : 1,
				freeUpdate : 100
			};
			return app.areaManager.createArea(opts, 'default');
		}).then(function(){
			return app.areaManager.joinServer(areaId, serverId);
		}).then(function(){
			return app.playerManager.joinArea('player1', areaId);
		}).then(function(){
			return app.playerManager.invokePlayer('player1', 'set', ['name', 'new name']);
		}).delay(flush + 50).then(function(){
			//should flushed
			return Q.nfcall(function(cb){
				app.playerManager.getPlayerModel().findById('player1').exec(cb);
			}).then(function(ret){
				ret.name.should.equal('new name');
			});
		}).then(function(){
			return app.playerManager.joinArea('player2', areaId).fail(function(e){
				//should fail
				logger.debug(e);
			});
		}).delay(timeout + 50).then(function(){
			//player 1 should quit now
			return app.areaManager.invokeArea(areaId, 'getPlayerCount').then(function(ret){
				ret.should.equal(0);
			});
		}).then(function(){
			return app.areaManager.quitServer(areaId);
		}).done(function(){
			app.stop(cb);
		});
	});
});
