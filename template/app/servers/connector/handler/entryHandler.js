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

var util = require('util');
var quick = require('quick-pomelo');
var P = quick.Promise;
var logger = quick.logger.getLogger('connector', __filename);

var Handler = function(app){
    this.app = app;
};

var proto = Handler.prototype;

var authFunc = function(token){
    //TODO: authentication;
    return token;
};

/**
 * msg.auth - authentication data
 */
proto.login = function(msg, session, next){
    if(!!session.uid){
        return next(new Error('session already logged in with playerId ' + session.uid));
    }

    var token = msg.token;
    if(!token){
        return next(new Error('token is missing'));
    }

    var playerId = null;

    return P.bind(this)
    .then(function(){
        return authFunc(token);
    })
    .then(function(ret){
        playerId = ret;
        if(!playerId){
            throw new Error('Invalid token: ' + token);
        }
    })
    .then(function(){
        return this.app.controllers.player.connectAsync(playerId, session.frontendId);
    })
    .then(function(ret){
        var oldConnectorId = ret.oldConnectorId;
        if(oldConnectorId){
            logger.warn('player %s already connected on %s, will kick', playerId, oldConnectorId);
            // kick original connector
            var entryRemote = this.app.rpc.connector.entryRemote;
            return P.promisify(entryRemote.kick, entryRemote)({frontendId : oldConnectorId}, playerId);
        }
    })
    .then(function(){
        return this.app.reqIdFilter.getReqId(playerId);
    })
    .then(function(reqId){
        var self = this;

        return P.promisify(session.bind, session)(playerId)
        .then(function(){
            // OnDisconnect
            session.on('closed', function(session, reason){
                if(reason === 'kick' || !session.uid){
                    return;
                }
                // auto logout on disconnect
                var goose = self.app.memdb.goose;
                goose.transaction(function(){
                    return P.promisify(self.logout, self)({closed : true}, session);
                }, self.app.getServerId())
                .catch(function(e){
                    logger.error(e.stack);
                });
            });

            logger.info('player %s login', playerId);

            return {reqId : reqId};
        });
    })
    .nodeify(next);
};

proto.logout = function(msg, session, next){
    var playerId = session.uid;
    if(!playerId){
        return next(new Error('playerId is missing'));
    }

    P.bind(this)
    .then(function(){
        return this.app.controllers.player.disconnectAsync(playerId);
    })
    .then(function(){
        if(!msg.closed){
            return P.promisify(session.unbind, session)(playerId);
        }
    })
    .then(function(){
        logger.info('player %s logout', playerId);
    })
    .nodeify(next);
};

module.exports = function(app){
    return new Handler(app);
};
