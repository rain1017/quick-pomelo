'use strict';

var Q = require('q');
var util = require('util');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var logger = require('pomelo-logger').getLogger('area', __filename);
var schema = require('./schema');

/*
 * @event player.join(playerId)
 * @event player.quit(playerId)
 * @event player.connect(playerId)
 * @event player.disconnect(playerId)
 * @event start()
 * @event stop()
 *
 * @params app - pomelo app instance
 * @params doc - mongodb document based on Area.schema
 */
var Area = function(app, doc){
	this.app = app;
	this._id = doc._id;
	this.players = {};
};

Area.schema = schema;

util.inherits(Area, EventEmitter);

var proto = Area.prototype;

// @param doc - mongodb document based on Area.schema
proto.toDoc = function(doc){

};

proto.start = function(){
	var self = this;
	return Q.fcall(function(){
		return self.loadPlayers();
	}).then(function(){
		return self.startChannel();
	}).then(function(){
		for(var playerId in self.players){
			self.players[playerId].notify = self.notify.bind(self, playerId);
		}
	}).then(function(){
		self.emit('start');
		logger.debug('area %s start', self._id);
	});
};

proto.stop = function(){
	var self = this;
	return Q.fcall(function(){
		return self.stopChannel();
	}).then(function(){
		return self.savePlayers();
	}).then(function(){
		self.emit('stop');
		logger.debug('area %s stop', self._id);
	});
};

/*
 * Sync players assignment from manager
 * Fix data inconsistency
 */
proto.syncAcquiredPlayers = function(){
	logger.debug('start sync acquired players');

	var self = this;
	return this.app.playerManager.getAcquiredPlayerIds(self._id).then(function(playerIds){
		var playerIdMap = {};
		playerIds.forEach(function(playerId){
			playerIdMap[playerId] = true;
		});

		var promises = [];

		playerIds.forEach(function(playerId){
			if(!self.players[playerId]){
				// release player lock if player is acquired but not joined
				promises.push(self.app.playerManager.releasePlayer(playerId, self._id).catch(function(e){
					logger.warn(e.stack);
				}));
			}
		});

		Object.keys(self.players).forEach(function(playerId){
			if(!playerIdMap[playerId]){
				// force quit player if palyer is joined but not acquired
				promises.push(self.quit(playerId, true).catch(function(e){
					logger.warn(e.stack);
				}));
			}
		});

		return Q.allSettled(promises).then(function(){
			logger.debug('finish sync acquired players');
		});
	});
};

proto.join = function(playerId){
	var self = this;

	return Q.fcall(function(){
		return self.beforeJoin();
	}).then(function(){
		return self.app.playerManager.acquirePlayer(playerId, self._id);
	}).then(function(){
		return Q.fcall(function(){
			return self.app.playerManager.loadPlayer(playerId, self._id);
		}).then(function(player){
			self.players[playerId] = player;
		}).then(function(){
			logger.debug('player %s joined area %s', playerId, self._id);
		}).catch(function(e){
			if(self.players.hasOwnProperty(playerId)){
				delete self.players[playerId];
			}
			self.app.playerManager.releasePlayer(playerId, self._id).catch(function(e){
				logger.warn(e.stack);
			});
			throw e;
		}).then(function(){
			self.emit('area.join', playerId);
		});
	});
};

proto.quit = function(playerId, force){
	var player = this.players[playerId];
	if(!player){
		logger.warn('player %s not in area %s', playerId, this._id);
		return;
	}

	var self = this;
	if(force){
		delete self.players[playerId];
		return Q.fcall(function(){
			self.emit('area.quit', playerId);
		}).then(function(){
			logger.warn('player %s quit area %s by force', playerId, self._id);
		});
	}

	return Q.fcall(function(){
		return self.beforeQuit(playerId);
	}).then(function(){
		return self.app.playerManager.savePlayer(player, self._id);
	}).then(function(){
		return self.app.playerManager.releasePlayer(playerId, self._id);
	}).then(function(){
		delete self.players[playerId];
		self.emit('area.quit', playerId);
	}).then(function(){
		logger.debug('player %s quit area %s', playerId, self._id);
	});
};

proto.loadPlayers = function(){
	this.players = {};
	var self = this;
	return this.app.playerManager.loadAcquiredPlayers(this._id).then(function(players){
		players.forEach(function(player){
			self.players[player._id] = player;
		});
		logger.debug('area %s loaded players', self._id);
	});
};

proto.savePlayers = function(){
	var self = this;
	return Q.fcall(function(){
		return self.syncAcquiredPlayers();
	}).then(function(){
		return Q.allSettled(Object.keys(self.players).map(function(playerId){
			var player = self.players[playerId];
			return self.app.playerManager.savePlayer(player, self._id)
					.catch(function(e){
						logger.warn(e.stack);
					});
		}));
	});
};

proto.startChannel = function(){
	this.channel = this.app.channelService.getChannel('area:' + this._id, true);
	for(var playerId in this.players){
		var player = this.players[playerId];
		if(player._connector){
			this.channel.add(player._id, player._connector);
		}
	}
};

proto.stopChannel = function(){
	this.app.channelService.destroyChannel('area:' + this._id);
};

proto.connect = function(playerId, connectorId){
	var player = this.getPlayer(playerId);
	if(player._connector){
		logger.warn('player %s already connected', playerId);
		this.channel.leave(playerId, player._connector);
	}

	player._connector = connectorId;
	this.channel.add(playerId, connectorId);

	this.emit('player.connect', playerId);
	logger.debug('player %s connected', playerId);
};

proto.disconnect = function(playerId){
	var player = this.getPlayer(playerId);
	if(!player._connector){
		logger.warn('player %s already disconnected', playerId);
		return;
	}

	this.channel.leave(playerId, player._connector);
	player._connector = null;

	this.emit('player.disconnect', playerId);
	logger.debug('player %s disconnected', playerId);
};

proto.notifyAll = function(route, msg){
	this.channel.pushMessage(route, msg);
	logger.debug('notify all players in area %s', this._id);
};

proto.notify = function(playerIds, route, msg){
	if(!playerIds){
		this.notifyAll(route, msg);
		return;
	}

	if(!(playerIds instanceof Array)){
		playerIds = [playerIds];
	}
	var self = this;
	var uidsids = playerIds.map(function(playerId){
		return self.channel.getMember(playerId);
	});
	this.app.channelService.pushMessageByUids(route, msg, uidsids);

	logger.debug('notify player %s in area %s', playerIds.join(','), this._id);
};

proto.beforeJoin = function(playerId){
	//Check prerequistics, you can prevent join by throw an exception
};

proto.beforeQuit = function(playerId){
	//Check prerequistics, you can prevent quit by throw an exception
};

proto.getPlayer = function(playerId){
	if(!this.players.hasOwnProperty(playerId)){
		throw new Error('player ' + playerId + ' not in area ' + this._id);
	}
	return this.players[playerId];
};

proto.hasPlayer = function(playerId){
	return !!this.players[playerId];
};

module.exports = Area;
