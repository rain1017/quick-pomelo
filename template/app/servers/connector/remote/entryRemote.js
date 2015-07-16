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

    //TODO: unbind instead of kick
    return P.promisify(sessionService.kick, sessionService)(playerId)
    .nodeify(cb);
};

module.exports = function(app){
    return new Remote(app);
};
