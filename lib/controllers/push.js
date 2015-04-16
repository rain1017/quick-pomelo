'use strict';

var P = require('bluebird');
var logger = require('pomelo-logger').getLogger('push', __filename);

// Msgs keep in history
var DEFAULT_MAX_MSG_COUNT = 100;

var Controller = function(app){
	this.app = app;

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
	var models = this.app.models;

	if(!connectorId){
		connectorId = '';
	}

	return P.bind(this)
	.then(function(){
		return P.bind(this)
		.then(function(){
			return models.Channel.findForUpdateAsync(channelId);
		})
		.then(function(channel){
			if(!channel){
				channel = new models.Channel({_id : channelId});
				logger.info('create channel %s', channelId);
			}
			channel.players[playerId] = connectorId;
			channel.markModified('players');
			return channel.saveAsync();
		});
	})
	.then(function(ret){
		return P.bind(this)
		.then(function(){
			return models.PlayerChannel.findForUpdateAsync(playerId);
		})
		.then(function(playerChannel){
			if(!playerChannel){
				playerChannel = new models.PlayerChannel({_id : playerId});
			}
			playerChannel.channels[channelId] = true;
			playerChannel.markModified('channels');
			return playerChannel.saveAsync();
		});
	})
	.then(function(){
		logger.info('join %j', [channelId, playerId, connectorId]);
	});
};

/**
 * player quit a channel
 * auto remove empty channels
 */
proto.quit = function(channelId, playerId){
	var models = this.app.models;

	return P.bind(this)
	.then(function(){
		return P.bind(this)
		.then(function(){
			return models.Channel.findForUpdateAsync(channelId);
		})
		.then(function(channel){
			if(!channel){
				throw new Error('channel ' + channelId + ' not exist');
			}
			delete channel.players[playerId];
			channel.markModified('players');

			if(Object.keys(channel.players).length === 0){
				logger.info('remove channel %s', channelId);
				return channel.removeAsync();
			}
			else{
				return channel.saveAsync();
			}
		});
	})
	.then(function(ret){
		return P.bind(this)
		.then(function(){
			return models.PlayerChannel.findForUpdateAsync(playerId);
		})
		.then(function(playerChannel){
			if(!playerChannel){
				throw new Error('playerChannel ' + playerId + ' not exist');
			}
			delete playerChannel.channels[channelId];
			playerChannel.markModified('channels');

			if(Object.keys(playerChannel.channels).length === 0){
				return playerChannel.removeAsync();
			}
			else{
				return playerChannel.saveAsync();
			}
		});
	})
	.then(function(){
		logger.info('quit %j', [channelId, playerId]);
	});
};

proto.connect = function(playerId, connectorId){
	if(!connectorId){
		connectorId = '';
	}
	var models = this.app.models;

	return P.bind(this)
	.then(function(){
		return models.PlayerChannel.findForUpdateAsync(playerId);
	})
	.then(function(playerChannel){
		if(!playerChannel){
			return;
		}
		return P.map(Object.keys(playerChannel.channels), function(channelId){
			return P.try(function(){
				return models.Channel.findForUpdateAsync(channelId);
			})
			.then(function(channel){
				if(!channel){
					throw new Error('channel ' + channelId + ' not exist');
				}
				channel.players[playerId] = connectorId;
				channel.markModified('players');
				return channel.saveAsync();
			});
		});
	})
	.then(function(){
		logger.info('connect %j', [playerId, connectorId]);
	});
};

proto.disconnect = function(playerId){
	var models = this.app.models;

	return P.bind(this)
	.then(function(){
		return models.PlayerChannel.findForUpdateAsync(playerId);
	})
	.then(function(playerChannel){
		if(!playerChannel){
			return;
		}
		return P.map(Object.keys(playerChannel.channels), function(channelId){
			return P.try(function(){
				return models.Channel.findForUpdateAsync(channelId);
			})
			.then(function(channel){
				if(!channel){
					throw new Error('channel ' + channelId + ' not exist');
				}
				channel.players[playerId] = '';
				channel.markModified('players');
				return channel.saveAsync();
			});
		});
	})
	.then(function(){
		logger.info('disconnect %j', [playerId]);
	});
};

proto.push = function(channelId, playerIds, route, msg, persistent){
	var args = [].slice.call(arguments);

	return P.bind(this)
	.then(function(){
		return this.app.models.Channel.findForUpdateAsync(channelId);
	})
	.then(function(channel){
		if(!channel){
			throw new Error('channel ' + channelId + ' not exist');
		}
		var seq = channel.seq;

		var pushMsg = {msg : msg, route : route};
		if(persistent){
			pushMsg.seq = seq;
		}

		if(persistent){
			channel.msgs.push(pushMsg);
			channel.seq++;
			if(channel.msgs.length > this.maxMsgCount){
				channel.msgs = channel.msgs.slice(this.maxMsgCount / 2);
			}
			channel.markModified('msgs');
		}

		var connectorUids = {};
		if(!!playerIds){
			if(persistent){
				throw new Error('can not send persistent message to specific players');
			}
			playerIds.forEach(function(playerId){
				if(channel.players.hasOwnProperty(playerId)){
					var connectorId = channel.players[playerId];
					if(!!connectorId){
						if(!connectorUids[connectorId]){
							connectorUids[connectorId] = [];
						}
						connectorUids[connectorId].push(playerId);
					}
				}
			});
		}
		else{
			for(var playerId in channel.players){
				var connectorId = channel.players[playerId];
				if(!!connectorId){
					if(!connectorUids[connectorId]){
						connectorUids[connectorId] = [];
					}
					connectorUids[connectorId].push(playerId);
				}
			}
		}

		return P.bind(this)
		.then(function(){
			return channel.saveAsync();
		})
		.then(function(){
			return this.pushToConnectors(connectorUids, route, pushMsg);
		});
	})
	.then(function(){
		logger.info('push %j', args);
	});
};

proto.pushToConnectors = function(connectorUids, route, msg){
	return P.bind(this)
	.then(function(){
		return Object.keys(connectorUids);
	})
	.map(function(connectorId){
		var uids = connectorUids[connectorId];
		var opts = {type : 'push', userOptions: {}, isPush : true};

		return P.promisify(this.app.rpcInvoke, this.app)(connectorId, {
			namespace : 'sys',
			service : 'channelRemote',
			method : 'pushMessage',
			args : [route, msg, uids, opts]
		})
		.catch(function(e){
			logger.warn(e);
		});
	})
	.then(function(){
		logger.info('pushToConnectors %j %j %j', connectorUids, route, msg);
	});
};

proto.getMsgs = function(channelId, seq, count){
	if(!seq){
		seq = 0;
	}
	if(!count){
		count = this.maxMsgCount;
	}
	return P.bind(this)
	.then(function(){
		return this.app.models.Channel.findAsync(channelId);
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
		var msgs = channel.msgs.slice(start, end);

		logger.info('getMsgs %j => %j', [channelId, seq, count], msgs);
		return msgs;
	});
};

module.exports = function(app){
	return new Controller(app);
};
