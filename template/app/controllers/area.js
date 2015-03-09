'use strict';

var Q = require('q');

var Controller = function(app){
	this.app = app;

	this.Area = app.models.Area;
	this.Player = app.models.Player;
};

var proto = Controller.prototype;

proto.create = function(opts){
	var area = new this.Area(opts);
	return area.saveQ();
};

proto.remove = function(areaId){
	var self = this;
	return Q.fcall(function(){
		return self.Area.findForUpdateQ(areaId);
	})
	.then(function(area){
		if(!area){
			throw new Error('area ' + areaId + ' not exist');
		}
		return Q.fcall(function(){
			return self.getPlayers(areaId);
		})
		.then(function(players){
			if(players.length > 0){
				throw new Error('area is not empty');
			}
			return self.Area.removeQ(areaId);
		});
	});
};

proto.getPlayers = function(areaId){
	return this.Player.findByIndexQ('areaId', areaId);
};

proto.join = function(areaId, playerId){
	var player = null;
	var self = this;
	return Q.fcall(function(){
		return self.Area.findForUpdateQ(areaId);
	})
	.then(function(area){
		if(!area){
			throw new Error('area ' + areaId + ' not exist');
		}
		return self.Player.findForUpdateQ(playerId);
	})
	.then(function(ret){
		player = ret;
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		player.areaId = areaId;
		return player.saveQ();
	})
	.then(function(){
		var channelId = 'a:' + areaId;
		return self.app.controllers.push.join(channelId, playerId, player.connectorId);
	});
};

proto.quit = function(playerId){
	var player = null;
	var self = this;
	return Q.fcall(function(){
		return self.Area.findForUpdateQ(areaId);
	})
	.then(function(area){
		if(!area){
			throw new Error('area ' + areaId + ' not exist');
		}
		return self.Player.findForUpdateQ(playerId);
	})
	.then(function(ret){
		player = ret;
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		player.areaId = '';
		return player.saveQ();
	})
	.then(function(){
		var channelId = 'a:' + areaId;
		return self.app.controllers.push.quit(channelId, playerId);
	});
};

/**
 * playerIds - [playerId], set null to push all
 */
proto.push = function(areaId, playerIds, route, msg, persistent){
	var channelId = 'a:' + areaId;
	return this.app.controllers.push.push(channelId, playerIds, route, msg, persistent);
};

proto.getMsgs = function(areaId, seq, count){
	var channelId = 'a:' + areaId;
	return this.app.controllers.push.getMsgs(channelId, seq, count);
};

module.exports = function(app){
	return new Controller(app);
};
