// Copyright 2015 MemDB.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied. See the License for the specific language governing
// permissions and limitations under the License. See the AUTHORS file
// for names of contributors.

'use strict';

var logger = require('memdb-client').logger.getLogger('push', __filename);
var P = require('memdb-client').Promise;

// Msgs keep in history
var DEFAULT_MAX_MSG_COUNT = 100;
// Max player count in one channel
var DEFAULT_MAX_PLAYER_COUNT = 1000;

var Controller = function(app){
    this.app = app;

    var opts = app.get('pushConfig') || {};
    this.config = {
        maxMsgCount : opts.maxMsgCount || DEFAULT_MAX_MSG_COUNT,
        maxPlayerCount : opts.maxPlayerCount || DEFAULT_MAX_PLAYER_COUNT,
    };

    this.msgBuff = {}; // {connectorId : [{uids : [uid], route : 'route', msg : msg}] }

    var self = this;
    this.app.event.on('transactionSuccess', function(){
        try{
            self.onTransactionSuccess();
        }
        catch(err){
            logger.error(err.stack);
        }
    });
    this.app.event.on('transactionFail', function(){
        try{
            self.onTransactionFail();
        }
        catch(err){
            logger.error(err.stack);
        }
    });
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
    var channel = null;

    return P.bind(this)
    .then(function(){
        return P.bind(this)
        .then(function(){
            return models.Channel.findByIdAsync(channelId);
        })
        .then(function(ret){
            if(ret){
                channel = ret;
                return;
            }

            channel = new models.Channel({_id : channelId});
            logger.info('create channel %s', channelId);

            var channelMsg = new models.ChannelMsg({_id : channelId});
            return channelMsg.saveAsync();
        })
        .then(function(){
            if(channel.players.length >= this.config.maxPlayerCount){
                throw new Error('player count in channel ' + channelId + ' exceed limit');
            }

            var index = channel.players.indexOf(playerId);
            if(index === -1){
                channel.players.push(playerId);
                channel.connectors.push(connectorId);
            }
            else{
                channel.connectors[index] = connectorId;
            }

            return channel.saveAsync();
        });
    })
    .then(function(ret){
        return P.bind(this)
        .then(function(){
            return models.PlayerChannel.findByIdAsync(playerId);
        })
        .then(function(playerChannel){
            if(!playerChannel){
                playerChannel = new models.PlayerChannel({_id : playerId});
            }
            if(playerChannel.channels.indexOf(channelId) === -1){
                playerChannel.channels.push(channelId);
            }
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
            return models.Channel.findByIdAsync(channelId);
        })
        .then(function(channel){
            if(!channel){
                throw new Error('channel ' + channelId + ' not exist');
            }
            var index = channel.players.indexOf(playerId);
            if(index !== -1){
                channel.players.splice(index, 1);
                channel.connectors.splice(index, 1);
            }

            if(channel.players.length === 0){
                logger.info('remove channel %s', channelId);
                return channel.removeAsync()
                .then(function(){
                    return models.ChannelMsg.removeAsync({_id : channelId});
                });
            }
            else{
                return channel.saveAsync();
            }
        });
    })
    .then(function(ret){
        return P.bind(this)
        .then(function(){
            return models.PlayerChannel.findByIdAsync(playerId);
        })
        .then(function(playerChannel){
            if(!playerChannel){
                throw new Error('playerChannel ' + playerId + ' not exist');
            }
            var index = playerChannel.channels.indexOf(channelId);
            if(index !== -1){
                playerChannel.channels.splice(index, 1);
            }

            if(playerChannel.channels.length === 0){
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
        return models.PlayerChannel.findByIdAsync(playerId);
    })
    .then(function(playerChannel){
        if(!playerChannel){
            return;
        }
        return P.each(playerChannel.channels, function(channelId){
            return P.try(function(){
                return models.Channel.findByIdAsync(channelId);
            })
            .then(function(channel){
                if(!channel){
                    throw new Error('channel ' + channelId + ' not exist');
                }
                var index = channel.players.indexOf(playerId);
                channel.connectors[index] = connectorId;
                return channel.saveAsync();
            });
        });
    })
    .then(function(){
        logger.info('connectAsync %j', [playerId, connectorId]);
    });
};

proto.disconnectAsync = function(playerId){
    var models = this.app.models;

    return P.bind(this)
    .then(function(){
        return models.PlayerChannel.findByIdAsync(playerId);
    })
    .then(function(playerChannel){
        if(!playerChannel){
            return;
        }
        return P.each(playerChannel.channels, function(channelId){
            return P.try(function(){
                return models.Channel.findByIdAsync(channelId);
            })
            .then(function(channel){
                if(!channel){
                    throw new Error('channel ' + channelId + ' not exist');
                }
                var index = channel.players.indexOf(playerId);
                channel.connectors[index] = '';
                return channel.saveAsync();
            });
        });
    })
    .then(function(){
        logger.info('disconnectAsync %j', [playerId]);
    });
};

proto.pushAsync = function(channelId, playerIds, route, msg, persistent){
    var args = [].slice.call(arguments);

    var channelMsg = null;
    var self = this;

    return P.try(function(){
        if(persistent){
            return self.app.models.ChannelMsg.findByIdAsync(channelId);
        }
    })
    .then(function(ret){
        channelMsg = ret;
        return self.app.models.Channel.findByIdAsync(channelId);
    })
    .then(function(channel){
        if(!channel){
            throw new Error('channel ' + channelId + ' not exist');
        }

        var pushMsg = {msg : msg, route : route};

        if(persistent){
            pushMsg.seq = channelMsg.seq;

            channelMsg.msgs.push(pushMsg);
            channelMsg.seq++;
            if(channelMsg.msgs.length > self.config.maxMsgCount){
                channelMsg.msgs = channelMsg.msgs.slice(self.config.maxMsgCount / 2);
            }
            channelMsg.markModified('msgs');
        }

        var connectorUids = {};
        if(!!playerIds){
            if(persistent){
                throw new Error('can not send persistent message to specific players');
            }
            playerIds.forEach(function(playerId){
                var index = channel.players.indexOf(playerId);
                if(index !== -1){
                    var connectorId = channel.connectors[index];
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
            for(var i=0; i<channel.players.length; i++){
                var connectorId = channel.connectors[i];
                if(!!connectorId){
                    if(!connectorUids[connectorId]){
                        connectorUids[connectorId] = [];
                    }
                    var playerId = channel.players[i];
                    connectorUids[connectorId].push(playerId);
                }
            }
        }

        // Save msg in buffer (will send on transaction success)
        Object.keys(connectorUids).forEach(function(connectorId){
            if(!self.msgBuff.hasOwnProperty(connectorId)){
                self.msgBuff[connectorId] = [];
            }
            self.msgBuff[connectorId].push({
                uids : connectorUids[connectorId],
                route : route,
                msg : pushMsg
            });
        });

        if(persistent){
            return channelMsg.saveAsync();
        }
    })
    .then(function(){
        logger.info('push %j', args);
    });
};

proto.onTransactionSuccess = function(){
    logger.debug('onTransactionSuccess');

    var msgBuff = this.msgBuff;
    this.msgBuff = {};

    var self = this;

    Object.keys(msgBuff).forEach(function(connectorId){

        msgBuff[connectorId].forEach(function(item){
            var opts = {type : 'push', userOptions: {}, isPush : true};

            // return immediately, ignore result
            P.promisify(self.app.rpcInvoke, self.app)(connectorId, {
                namespace : 'sys',
                service : 'channelRemote',
                method : 'pushMessage',
                args : [item.route, item.msg, item.uids, opts]
            })
            .catch(function(e){
                logger.warn(e.stack);
            })
            .then(function(){
                logger.info('pushToConnectors %s %j %j %j', connectorId, item.uids, item.route, item.msg);
            });
        });
    });
};

proto.onTransactionFail = function(){
    logger.debug('onTransactionFail');
    // Clear msg buff
    this.msgBuff = {};
};

proto.getMsgsAsync = function(channelId, seq, count){
    if(!seq){
        seq = 0;
    }
    if(!count){
        count = this.config.maxMsgCount;
    }
    return P.bind(this)
    .then(function(){
        return this.app.models.ChannelMsg.findByIdAsync(channelId);
    })
    .then(function(channelMsg){
        if(!channelMsg){
            throw new Error('channel ' + channelId + ' not exist');
        }

        var start = seq - channelMsg.seq + channelMsg.msgs.length, end = start + count;
        if(start < 0){
            start = 0;
        }
        if(end < 0){
            end = 0;
        }
        var msgs = channelMsg.msgs.slice(start, end);

        logger.info('getMsgsAsync %j => %j', [channelId, seq, count], msgs);
        return msgs;
    });
};

module.exports = function(app){
    return new Controller(app);
};
