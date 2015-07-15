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

        return ret.player.reqId;
    })
    .then(function(reqId){
        session.set('reqId', reqId);
        return P.promisify(session.bind, session)(playerId);
    })
    .then(function(){
        // OnDisconnect
        var self = this;
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

        return P.promisify(session.pushAll, session)();
    })
    .then(function(){
        logger.info('player %s login', playerId);
        return {reqId : session.get('reqId')};
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
        return this.app.controllers.player.disconnectAsync(playerId, session.get('reqId'));
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
