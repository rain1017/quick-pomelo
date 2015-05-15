'use strict';

var P = require('bluebird');
var uuid = require('node-uuid');
var logger = require('pomelo-logger').getLogger('player', __filename);

var Controller = function(app){
    this.app = app;
};

var proto = Controller.prototype;

proto.createAsync = function(opts){
    var player = new this.app.models.Player(opts);
    if(!player._id){
        player._id = uuid.v4();
    }
    var playerId = player._id;

    return P.bind(this)
    .then(function(){
        return player.saveAsync();
    })
    .then(function(){
        var channelId = 'p.' + playerId;
        return this.app.controllers.push.joinAsync(channelId, playerId);
    })
    .then(function(){
        logger.info('create %j => %s', opts, playerId);
        return playerId;
    });
};

proto.removeAsync = function(playerId){
    return P.bind(this)
    .then(function(){
        return this.app.models.Player.findLockedAsync(playerId);
    })
    .then(function(player){
        if(!player){
            throw new Error('player ' + playerId + ' not exist');
        }
        return P.bind(this)
        .then(function(){
            if(!!player.areaId){
                return this.app.controllers.area.quitAsync(player.areaId, playerId);
            }
        })
        .then(function(){
            if(!!player.teamId){
                return this.app.controllers.team.quitAsync(player.teamId, playerId);
            }
        })
        .then(function(){
            var channelId = 'p.' + playerId;
            return this.app.controllers.push.quitAsync(channelId, playerId);
        })
        .then(function(){
            return player.removeAsync();
        });
    })
    .then(function(){
        logger.info('remove %s', playerId);
    });
};

proto.connectAsync = function(playerId, connectorId){
    var player = null;
    var oldConnectorId = null;

    return P.bind(this)
    .then(function(){
        return this.app.models.Player.findLockedAsync(playerId);
    })
    .then(function(ret){
        player = ret;
        if(!player){
            throw new Error('player ' + playerId + ' not exist');
        }
        oldConnectorId = player.connectorId;
        player.connectorId = connectorId;
        return player.saveAsync();
    })
    .then(function(){
        return this.app.controllers.push.connectAsync(playerId, connectorId);
    })
    .then(function(){
        logger.info('connect %s %s => %s', playerId, connectorId, oldConnectorId);
        return oldConnectorId;
    });
};

proto.disconnectAsync = function(playerId){
    var player = null;

    return P.bind(this)
    .then(function(){
        return this.app.models.Player.findLockedAsync(playerId);
    })
    .then(function(ret){
        player = ret;
        if(!player){
            throw new Error('player ' + playerId + ' not exist');
        }
        player.connectorId = '';
        return player.saveAsync();
    })
    .then(function(){
        return this.app.controllers.push.disconnectAsync(playerId);
    })
    .then(function(){
        logger.info('disconnect %s', playerId);
    });
};

proto.pushAsync = function(playerId, route, msg, persistent){
    var channelId = 'p.' + playerId;
    return this.app.controllers.push.pushAsync(channelId, null, route, msg, persistent);
};

proto.getMsgsAsync = function(playerId, seq, count){
    var channelId = 'p.' + playerId;
    return this.app.controllers.push.getMsgsAsync(channelId, seq, count);
};

module.exports = function(app){
    return new Controller(app);
};

