'use strict';
var logger = require('quick-pomelo').logger.getLogger('connector', __filename);
var P = require('quick-pomelo').Promise;
var util = require('util');

var Remote = function(app){
    this.app = app;
};

// returns: current reqId
Remote.prototype.kick = function(playerId, cb){
    logger.warn('kicking %s', playerId);

    var sessionService = this.app.get('sessionService');

    P.try(function(){
        var sessions = sessionService.getByUid(playerId);
        if(sessions.length === 0){
            throw new Error('session not exist for uid ' + playerId);
        }
        var reqId = sessions[0].get('reqId');

        //TODO: unbind instead of kick
        return P.promisify(sessionService.kick, sessionService)(playerId)
        .thenReturn(reqId);
    })
    .nodeify(cb);
};

module.exports = function(app){
    return new Remote(app);
};
