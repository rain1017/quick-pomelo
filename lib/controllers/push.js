'use strict';

var logger = require('memdb').logger.getLogger('push', __filename);
var P = require('memdb').Promise;

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
proto.joinAsync = function(channelId, playerId, connectorId){
    var models = this.app.models;

    if(!connectorId){
        connectorId = '';
    }

    return P.bind(this)
    .then(function(){
        return P.bind(this)
        .then(function(){
            return models.Channel.findAsync(channelId);
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
            return models.PlayerChannel.findAsync(playerId);
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
        logger.info('joinAsync %j', [channelId, playerId, connectorId]);
    });
};

/**
 * player quit a channel
 * auto remove empty channels
 */
proto.quitAsync = function(channelId, playerId){
    var models = this.app.models;

    return P.bind(this)
    .then(function(){
        return P.bind(this)
        .then(function(){
            return models.Channel.findAsync(channelId);
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
            return models.PlayerChannel.findAsync(playerId);
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
        logger.info('quitAsync %j', [channelId, playerId]);
    });
};

proto.connectAsync = function(playerId, connectorId){
    if(!connectorId){
        connectorId = '';
    }
    var models = this.app.models;

    return P.bind(this)
    .then(function(){
        return models.PlayerChannel.findAsync(playerId);
    })
    .then(function(playerChannel){
        if(!playerChannel){
            return;
        }
        return P.map(Object.keys(playerChannel.channels), function(channelId){
            return P.try(function(){
                return models.Channel.findAsync(channelId);
            })
            .then(function(channel){
                if(!channel){
                    throw new Error('channel ' + channelId + ' not exist');
                }
                channel.players[playerId] = connectorId;
                channel.markModified('players');
                return channel.saveAsync();
            });
        }, {concurrency : 1});
    })
    .then(function(){
        logger.info('connectAsync %j', [playerId, connectorId]);
    });
};

proto.disconnectAsync = function(playerId){
    var models = this.app.models;

    return P.bind(this)
    .then(function(){
        return models.PlayerChannel.findAsync(playerId);
    })
    .then(function(playerChannel){
        if(!playerChannel){
            return;
        }
        return P.map(Object.keys(playerChannel.channels), function(channelId){
            return P.try(function(){
                return models.Channel.findAsync(channelId);
            })
            .then(function(channel){
                if(!channel){
                    throw new Error('channel ' + channelId + ' not exist');
                }
                channel.players[playerId] = '';
                channel.markModified('players');
                return channel.saveAsync();
            });
        }, {concurrency : 1});
    })
    .then(function(){
        logger.info('disconnectAsync %j', [playerId]);
    });
};

proto.pushAsync = function(channelId, playerIds, route, msg, persistent){
    var args = [].slice.call(arguments);

    return P.bind(this)
    .then(function(){
        return this.app.models.Channel.findAsync(channelId);
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
            return this.pushToConnectorsAsync(connectorUids, route, pushMsg);
        });
    })
    .then(function(){
        logger.info('push %j', args);
    });
};

proto.pushToConnectorsAsync = function(connectorUids, route, msg){
    return P.bind(this)
    .then(function(){
        return Object.keys(connectorUids);
    })
    .map(function(connectorId){
        var uids = connectorUids[connectorId];
        var opts = {type : 'push', userOptions: {}, isPush : true};

        // No wait
        P.promisify(this.app.rpcInvoke, this.app)(connectorId, {
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
        logger.info('pushToConnectorsAsync %j %j %j', connectorUids, route, msg);
    });
};

proto.getMsgsAsync = function(channelId, seq, count){
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

        logger.info('getMsgsAsync %j => %j', [channelId, seq, count], msgs);
        return msgs;
    });
};

module.exports = function(app){
    return new Controller(app);
};
