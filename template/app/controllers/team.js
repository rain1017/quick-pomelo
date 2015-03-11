'use strict';

var Q = require('q');
var uuid = require('node-uuid');
var logger = require('pomelo-logger').getLogger('team', __filename);

var Controller = function(app){
	this.app = app;
};

var proto = Controller.prototype;

proto.create = function(opts){
	var team = new this.app.models.Team(opts);
	if(!team._id){
		team._id = uuid.v4();
	}
	var teamId = team._id;

	return Q.fcall(function(){
		return team.saveQ();
	})
	.then(function(){
		logger.info('create %j => %j', opts, teamId);
		return teamId;
	});
};

proto.remove = function(teamId){
	var self = this;
	return Q.fcall(function(){
		return self.app.models.Team.findForUpdateQ(teamId);
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
			return team.removeQ();
		});
	})
	.then(function(){
		logger.info('remove %s', teamId);
	});
};

proto.getPlayers = function(teamId){
	return this.app.models.Player.findByIndexQ('teamId', teamId);
};

proto.join = function(teamId, playerId){
	var player = null;
	var self = this;
	return Q.fcall(function(){
		return self.app.models.Team.findForUpdateQ(teamId);
	})
	.then(function(team){
		if(!team){
			throw new Error('team ' + teamId + ' not exist');
		}
		return self.app.models.Player.findForUpdateQ(playerId);
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
		var channelId = 't.' + teamId;
		return self.app.controllers.push.join(channelId, playerId, player.connectorId);
	})
	.then(function(){
		logger.info('join %s %s', teamId, playerId);
	});
};

proto.quit = function(teamId, playerId){
	var player = null;
	var self = this;
	return Q.fcall(function(){
		return self.app.models.Player.findForUpdateQ(playerId);
	})
	.then(function(ret){
		player = ret;
		return self.app.models.Team.findForUpdateQ(teamId);
	})
	.then(function(){
		if(!player){
			throw new Error('player ' + playerId + ' not exist');
		}
		if(player.teamId !== teamId){
			throw new Error('player ' + playerId + ' not in team ' + teamId);
		}
		player.teamId = '';
		return player.saveQ();
	})
	.then(function(){
		var channelId = 't.' + teamId;
		return self.app.controllers.push.quit(channelId, playerId);
	})
	.then(function(){
		logger.info('quit %s %s', teamId, playerId);
	});
};

/**
 * playerIds - [playerId], set null to push all
 */
proto.push = function(teamId, playerIds, route, msg, persistent){
	var channelId = 't.' + teamId;
	return this.app.controllers.push.push(channelId, playerIds, route, msg, persistent);
};

proto.getMsgs = function(teamId, seq, count){
	var channelId = 't.' + teamId;
	return this.app.controllers.push.getMsgs(channelId, seq, count);
};

module.exports = function(app){
	return new Controller(app);
};
