'use strict';

var Q = require('q');
var logger = require('pomelo-logger').getLogger('push', __filename);

// Msgs keep in history
var DEFAULT_MAX_MSG_COUNT = 100;

var Controller = function(app){
	this.app = app;

	this.Channel = app.models.Channel; // call mdbgoose.Model('Channel');
	this.PlayerChannel = app.models.PlayerChannel;

	var opts = app.get('pushConfig') || {};
	this.maxMsgCount = opts.maxMsgCount || DEFAULT_MAX_MSG_COUNT;
};

var proto = Controller.prototype;

/**
 * ChannelIds:
 *
 * a:areaId - channel for an area
 * t:teamId - channel for a team
 * p:playerId - channel for a player
 * g:groupId - channel for a discussion group
 */

/**
 * player join a channel
 * auto create new channels
 */
proto.join = function(channelId, playerId, connectorId){
	if(!connectorId){
		connectorId = '';
	}
	var self = this;
	return Q.fcall(function(){
		return Q.fcall(function(){
			return self.Channel.findForUpdateQ(channelId);
		})
		.then(function(channel){
			if(!channel){
				channel = new self.Channel({_id : channelId});
			}
			channel.players[playerId] = connectorId;
			return channel.saveQ();
		});
	})
	.then(function(ret){
		return Q.fcall(function(){
			return self.PlayerChannel.findForUpdateQ(playerId);
		})
		.then(function(playerChannel){
			if(!playerChannel){
				playerChannel = new self.PlayerChannel({_id : playerId});
			}
			playerChannel.channels[channelId] = true;
			return playerChannel.saveQ();
		});
	});
};

/**
 * player quit a channel
 * auto remove empty channels
 */
proto.quit = function(channelId, playerId){
	var self = this;
	return Q.fcall(function(){
		return Q.fcall(function(){
			return self.Channel.findForUpdateQ(channelId);
		})
		.then(function(channel){
			if(!channel){
				throw new Error('channel ' + channelId + ' not exist');
			}
			delete channel.players[playerId];
			if(Object.keys(channel.players).length === 0){
				return channel.removeQ();
			}
			else{
				return channel.saveQ();
			}
		});
	})
	.then(function(ret){
		return Q.fcall(function(){
			return self.PlayerChannel.findForUpdateQ(playerId);
		})
		.then(function(playerChannel){
			if(!playerChannel){
				throw new Error('playerChannel ' + playerId + ' not exist');
			}
			delete playerChannel.channels[channelId];
			if(Object.keys(playerChannel.channels).length === 0){
				return playerChannel.removeQ();
			}
			else{
				return playerChannel.saveQ();
			}
		});
	});
};

proto.connect = function(playerId, connectorId){
	if(!connectorId){
		connectorId = '';
	}
	var self = this;
	return Q.fcall(function(){
		return self.PlayerChannel.findForUpdateQ(playerId);
	})
	.then(function(playerChannel){
		if(!playerChannel){
			return;
		}
		return Q.all(Object.keys(playerChannel.channels).map(function(channelId){
			return Q.fcall(function(){
				return self.Channel.findForUpdateQ(channelId);
			})
			.then(function(channel){
				if(!channel){
					throw new Error('channel ' + channelId + ' not exist');
				}
				channel.players[playerId] = connectorId;
				return channel.saveQ();
			});
		}));
	});
};

proto.disconnect = function(playerId){
	var self = this;
	return Q.fcall(function(){
		return self.PlayerChannel.findForUpdateQ(playerId);
	})
	.then(function(playerChannel){
		if(!playerChannel){
			return;
		}
		return Q.all(Object.keys(playerChannel.channels).map(function(channelId){
			return Q.fcall(function(){
				return self.Channel.findForUpdateQ(channelId);
			})
			.then(function(channel){
				if(!channel){
					throw new Error('channel ' + channelId + ' not exist');
				}
				channel.players[playerId] = '';
				return channel.saveQ();
			});
		}));
	});
};

proto.push = function(channelId, playerIds, route, msg, persistent){
	var self = this;
	return Q.fcall(function(){
		return self.Channel.findForUpdateQ(channelId);
	})
	.then(function(channel){
		if(!channel){
			throw new Error('channel ' + channelId + ' not exist');
		}
		if(persistent){
			msg.seq = channel.seq;
			channel.msgs.push(msg);
			channel.seq++;
			if(channel.msgs.length > self.maxMsgCount){
				channel.msgs = channel.msgs.slice(self.maxMsgCount / 2);
			}
		}

		var uidsids = [];
		if(!!playerIds){
			playerIds.forEach(function(playerId){
				if(channel.players.hasOwnProperty(playerId)){
					var connectorId = channel.players[playerId];
					uidsids.push({uid : playerId, sid : connectorId});
				}
			});
		}
		else{
			for(var playerId in channel.players){
				var connectorId = channel.players[playerId];
				uidsids.push({uid : playerId, sid : connectorId});
			}
		}

		//TODO: Push to front server

		return channel.saveQ();
	});
};

proto.getMsgs = function(channelId, seq, count){
	var self = this;
	return Q.fcall(function(){
		return self.Channel.findQ(channelId);
	})
	.then(function(channel){
		if(!channel){
			throw new Error('channel ' + channelId + ' not exist');
		}
		var start = seq - channel.seq + channel.msgs.length, end = start + count;
		if(start < 0){
			start = 0;
		}
		if(end < 0){
			end = 0;
		}
		var msgs = channel.msgs.slice(seq - start, seq - end + count);
		return msgs;
	});
};

module.exports = function(app){
	return new Controller(app);
};
