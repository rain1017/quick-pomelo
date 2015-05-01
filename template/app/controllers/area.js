'use strict';

var P = require('bluebird');
var uuid = require('node-uuid');
var logger = require('pomelo-logger').getLogger('area', __filename);

var Controller = function(app){
	this.app = app;
};

var proto = Controller.prototype;

proto.create = function(opts){
	var area = new this.app.models.Area(opts);
	if(!area._id){
		area._id = uuid.v4();
	}
	var areaId = area._id;

	return P.bind(this)
	.then(function(){
		return area.saveAsync();
	})
	.then(function(){
		logger.info('create %j => %j', opts, areaId);
		return areaId;
	});
};

proto.remove = function(areaId){
	return P.bind(this)
	.then(function(){
		return this.app.models.Area.findByIdForUpdateAsync(areaId);
	})
	.then(function(area){
		if(!area){
			throw new Error('area ' + areaId + ' not exist');
		}
		return P.bind(this)
		.then(function(){
			return this.getPlayers(areaId);
		})
		.then(function(players){
			if(players.length > 0){
				throw new Error('area is not empty');
			}
			return area.removeAsync();
		});
	})
	.then(function(){
		logger.info('remove %s', areaId);
	});
};

proto.getPlayers = function(areaId){
	return this.app.models.Player.findAsync({areaId : areaId});
};

proto.join = function(areaId, playerId){
	var player = null;

	return P.bind(this)
	.then(function(){
		return this.app.models.Area.findByIdForUpdateAsync(areaId);
	})
	.then(function(area){
		if(!area){
			throw new Error('area ' + areaId + ' not exist');
		}
		return this.app.models.Player.findByIdForUpdateAsync(playerId);
	})
	.then(function(ret){
		player = ret;
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		player.areaId = areaId;
		return player.saveAsync();
	})
	.then(function(){
		var channelId = 'a.' + areaId;
		return this.app.controllers.push.join(channelId, playerId, player.connectorId);
	})
	.then(function(){
		logger.info('join %s %s', areaId, playerId);
	});
};

proto.quit = function(areaId, playerId){
	var player = null;

	return P.bind(this)
	.then(function(){
		return this.app.models.Player.findByIdForUpdateAsync(playerId);
	})
	.then(function(ret){
		player = ret;
		return this.app.models.Area.findByIdForUpdateAsync(areaId);
	})
	.then(function(){
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		if(player.areaId !== areaId){
			throw new Error('player ' + playerId + ' not in area ' + areaId);
		}
		player.areaId = '';
		return player.saveAsync();
	})
	.then(function(){
		var channelId = 'a.' + areaId;
		return this.app.controllers.push.quit(channelId, playerId);
	})
	.then(function(){
		logger.info('quit %s %s', areaId, playerId);
	});
};

/**
 * playerIds - [playerId], set null to push all
 */
proto.push = function(areaId, playerIds, route, msg, persistent){
	var channelId = 'a.' + areaId;
	return this.app.controllers.push.push(channelId, playerIds, route, msg, persistent);
};

proto.getMsgs = function(areaId, seq, count){
	var channelId = 'a.' + areaId;
	return this.app.controllers.push.getMsgs(channelId, seq, count);
};

module.exports = function(app){
	return new Controller(app);
};
