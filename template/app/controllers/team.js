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
var logger = quick.logger.getLogger('team', __filename);
var uuid = require('node-uuid');

var Controller = function(app){
    this.app = app;
};

var proto = Controller.prototype;

proto.createAsync = function(opts){
    var team = new this.app.models.Team(opts);
    if(!team._id){
        team._id = uuid.v4();
    }
    var teamId = team._id;

    return P.bind(this)
    .then(function(){
        return team.saveAsync();
    })
    .then(function(){
        logger.info('create %j => %j', opts, teamId);
        return teamId;
    });
};

proto.removeAsync = function(teamId){
    return P.bind(this)
    .then(function(){
        return this.app.models.Team.findByIdAsync(teamId);
    })
    .then(function(team){
        if(!team){
            throw new Error('team ' + teamId + ' not exist');
        }
        return P.bind(this)
        .then(function(){
            return this.getPlayersAsync(teamId);
        })
        .then(function(players){
            if(players.length > 0){
                throw new Error('team is not empty');
            }
            return team.removeAsync();
        });
    })
    .then(function(){
        logger.info('remove %s', teamId);
    });
};

proto.getPlayersAsync = function(teamId){
    return this.app.models.Player.findAsync({teamId : teamId});
};

proto.joinAsync = function(teamId, playerId){
    var player = null;

    return P.bind(this)
    .then(function(){
        return this.app.models.Team.findByIdAsync(teamId);
    })
    .then(function(team){
        if(!team){
            throw new Error('team ' + teamId + ' not exist');
        }
        return this.app.models.Player.findByIdAsync(playerId);
    })
    .then(function(ret){
        player = ret;
        if(!player){
            throw new Error('player ' + playerId + ' not exist');
        }
        player.teamId = teamId;
        return player.saveAsync();
    })
    .then(function(){
        var channelId = 't:' + teamId;
        return this.app.controllers.push.joinAsync(channelId, playerId, player.connectorId);
    })
    .then(function(){
        logger.info('join %s %s', teamId, playerId);
    });
};

proto.quitAsync = function(teamId, playerId){
    var player = null;

    return P.bind(this)
    .then(function(){
        return this.app.models.Player.findByIdAsync(playerId);
    })
    .then(function(ret){
        player = ret;
        return this.app.models.Team.findByIdAsync(teamId);
    })
    .then(function(){
        if(!player){
            throw new Error('player ' + playerId + ' not exist');
        }
        if(player.teamId !== teamId){
            throw new Error('player ' + playerId + ' not in team ' + teamId);
        }
        player.teamId = '';
        return player.saveAsync();
    })
    .then(function(){
        var channelId = 't:' + teamId;
        return this.app.controllers.push.quitAsync(channelId, playerId);
    })
    .then(function(){
        logger.info('quit %s %s', teamId, playerId);
    });
};

/**
 * playerIds - [playerId], set null to push all
 */
proto.pushAsync = function(teamId, playerIds, route, msg, persistent){
    var channelId = 't:' + teamId;
    return this.app.controllers.push.pushAsync(channelId, playerIds, route, msg, persistent);
};

proto.getMsgsAsync = function(teamId, seq, count){
    var channelId = 't:' + teamId;
    return this.app.controllers.push.getMsgsAsync(channelId, seq, count);
};

module.exports = function(app){
    return new Controller(app);
};
