'use strict';

var _ = require('lodash');
var env = require('../env');
var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('defaultarea test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('defaultarea allocator', function(cb){
		this.timeout(10 * 1000);

		var playerCount = 6;
		var resizeInterval = 200;
		var areaTimeout = 1000;

		var opts = {
			'defaultAreaAllocator' : {
				areaCapacity : 3,
				areaTimeout : areaTimeout,
				areaFreeUpdate : resizeInterval - 20,
				resizeInterval : resizeInterval,
				minFree : 3,
				maxFree : 6,
				autoIncrement : true,
			}
		};
		var allocatorApp = env.createMockApp('allocator-server', 'allocator', opts);
		var areaApp = env.createMockApp('area-server-1', 'area');

		allocatorApp.setRemoteApps([areaApp]);
		areaApp.setRemoteApps([allocatorApp]);

		var onCreateArea = function(areaId){
			areaApp.areaProxy.joinServer(areaId, 'area-server-1');
		};

		var playerIds = _.range(playerCount);

		Q.fcall(function(){
			return Q.ninvoke(areaApp, 'start');
		}).then(function(){
			// Automatically join server when new area created
			areaApp.areaBackend.on('area:create', onCreateArea);
		}).then(function(){
			return Q.ninvoke(allocatorApp, 'start');
		}).then(function(){
			return Q.all(playerIds.map(function(playerId){
				return areaApp.playerBackend.createPlayer({_id : playerId});
			}));
		}).then(function(){
			//Create a normal area
			return areaApp.areaBackend.createArea({_id :'room1'}, 'room');
		}).delay(resizeInterval + 200)
		.then(function(){
			//should have enough free slots now
		}).then(function(){
			var promises = playerIds.map(function(playerId){
				return function(){
					return Q.fcall(function(){
						return areaApp.playerProxy.invokePlayer(playerId, 'set', ['name', 'player' + playerId]);
					}).catch(function(e){
						//Failure is possible
						logger.warn(e.stack);
					}).delay(100);
				};
			});
			return promises.reduce(Q.when, Q()); // jshint ignore:line
		}).then(function(){
			//should created more areas now
		}).delay(areaTimeout + 200)
		.then(function(){
			//players timed out
			//should quit and removed redundant areas
		})
		.then(function(){
			areaApp.areaBackend.removeListener('area:create', onCreateArea);
		}).done(function(){
			Q.all([Q.ninvoke(allocatorApp, 'stop'), Q.ninvoke(areaApp, 'stop')])
			.then(function(){
				cb();
			});
		});
	});
});
