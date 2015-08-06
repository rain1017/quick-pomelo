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

var quick = require('quick-pomelo');
var P = quick.Promise;
var logger = quick.logger.getLogger('area', __filename);
var uuid = require('node-uuid');

var Controller = function(app){
    this.app = app;
};

var proto = Controller.prototype;

proto.createAsync = function(opts){
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

proto.removeAsync = function(areaId){
    return P.bind(this)
    .then(function(){
        return this.app.models.Area.findByIdAsync(areaId);
    })
    .then(function(area){
        if(!area){
            throw new Error('area ' + areaId + ' not exist');
        }
        return P.bind(this)
        .then(function(){
            return this.getPlayersAsync(areaId);
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

proto.getPlayersAsync = function(areaId){
    return this.app.models.Player.findAsync({areaId : areaId});
};

proto.joinAsync = function(areaId, playerId){
    var player = null;

    return P.bind(this)
    .then(function(){
        return this.app.models.Area.findByIdAsync(areaId);
    })
    .then(function(area){
        if(!area){
            throw new Error('area ' + areaId + ' not exist');
        }
        return this.app.models.Player.findByIdAsync(playerId);
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
        var channelId = 'a:' + areaId;
        return this.app.controllers.push.joinAsync(channelId, playerId, player.connectorId);
    })
    .then(function(){
        logger.info('join %s %s', areaId, playerId);
    });
};

proto.quitAsync = function(areaId, playerId){
    var player = null;

    return P.bind(this)
    .then(function(){
        return this.app.models.Player.findByIdAsync(playerId);
    })
    .then(function(ret){
        player = ret;
        return this.app.models.Area.findByIdAsync(areaId);
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
        var channelId = 'a:' + areaId;
        return this.app.controllers.push.quitAsync(channelId, playerId);
    })
    .then(function(){
        logger.info('quit %s %s', areaId, playerId);
    });
};

/**
 * playerIds - [playerId], set null to push all
 */
proto.pushAsync = function(areaId, playerIds, route, msg, persistent){
    var channelId = 'a:' + areaId;
    return this.app.controllers.push.pushAsync(channelId, playerIds, route, msg, persistent);
};

proto.getMsgsAsync = function(areaId, seq, count){
    var channelId = 'a:' + areaId;
    return this.app.controllers.push.getMsgsAsync(channelId, seq, count);
};

module.exports = function(app){
    return new Controller(app);
};
