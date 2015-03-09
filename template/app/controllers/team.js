'use strict';

var Q = require('q');

var Controller = function(app){
	this.app = app;

	this.Team = app.models.Team;
	this.Player = app.models.Player;
};

var proto = Controller.prototype;

proto.create = function(opts){
	var team = new this.Team(opts);
	return team.saveQ();
};

proto.remove = function(teamId){
	var self = this;
	return Q.fcall(function(){
		return sekf.Team.findForUpdateQ(teamId);
	})
	.then(function(team){
		if(!team){
			throw new Error('team ' + teamId + ' not exist');
		}
		return Q.fcall(function(){
			return self.getPlayers(teamId);
		})
		.then(function(players){
			if(players.length > 0){
				throw new Error('team is not empty');
			}
			return self.Team.removeQ(teamId);
		});
	});
};

proto.getPlayers = function(teamId){
	return this.Player.findByIndexQ('teamId', teamId);
};

proto.join = function(teamId, playerId){
	var player = null;
	var self = this;
	return Q.fcall(function(){
		return self.Team.findForUpdateQ(teamId);
	})
	.then(function(team){
		if(!team){
			throw new Error('team ' + teamId + ' not exist');
		}
		return self.Player.findForUpdateQ(playerId);
	})
	.then(function(ret){
		player = ret;
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		player.teamId = teamId;
		return player.saveQ();
	})
	.then(function(){
		var channelId = 't:' + teamId;
		return self.app.controllers.push.join(channelId, playerId, player.connectorId);
	});
};

proto.quit = function(playerId){
	var player = null;
	var self = this;
	return Q.fcall(function(){
		return self.Team.findForUpdateQ(teamId);
	})
	.then(function(team){
		if(!team){
			throw new Error('team ' + teamId + ' not exist');
		}
		return self.Player.findForUpdateQ(playerId);
	})
	.then(function(ret){
		player = ret;
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		player.teamId = '';
		return player.saveQ();
	})
	.then(function(){
		var channelId = 't:' + teamId;
		return self.app.controllers.push.quit(channelId, playerId);
	});
};

/**
 * playerIds - [playerId], set null to push all
 */
proto.push = function(teamId, playerIds, route, msg, persistent){
	var channelId = 't:' + teamId;
	return this.app.controllers.push.push(channelId, playerIds, route, msg, persistent);
};

proto.getMsgs = function(teamId, seq, count){
	var channelId = 't:' + teamId;
	return this.app.controllers.push.getMsgs(channelId, seq, count);
};

module.exports = function(app){
	return new Controller(app);
};
