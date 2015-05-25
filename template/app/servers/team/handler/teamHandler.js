'use strict';

var P = require('quick-pomelo').Promise;

var Handler = function(app){
    this.app = app;
};

var proto = Handler.prototype;

proto.create = function(msg, session, next){
    var opts = msg.opts;
    return this.app.controllers.team.createAsync(opts)
    .nodeify(next);
};

proto.remove = function(msg, session, next){
    var teamId = msg.teamId || session.uid;
    if(!teamId){
        return next(new Error('teamId is missing'));
    }
    return this.app.controllers.team.removeAsync(teamId)
    .nodeify(next);
};

proto.join = function(msg, session, next){
    var playerId = session.uid;
    var teamId = msg.teamId;
    if(!playerId || !teamId){
        return next(new Error('playerId or teamId is missing'));
    }
    return this.app.controllers.team.joinAsync(teamId, playerId)
    .nodeify(next);
};

proto.quit = function(msg, session, next){
    var playerId = session.uid;
    var teamId = msg.teamId;
    if(!playerId || !teamId){
        return next(new Error('playerId or teamId is missing'));
    }
    return this.app.controllers.team.quitAsync(teamId, playerId)
    .nodeify(next);
};

proto.push = function(msg, session, next){
    var teamId = msg.teamId;
    if(!teamId){
        return next(new Error('teamId is missing'));
    }
    return this.app.controllers.team.pushAsync(teamId, msg.playerIds, msg.route, msg.msg, msg.persistent)
    .nodeify(next);
};

proto.getMsgs = function(msg, session, next){
    var teamId = msg.teamId;
    if(!teamId){
        return next(new Error('teamId is missing'));
    }
    return this.app.controllers.team.getMsgsAsync(teamId, msg.seq, msg.count)
    .nodeify(next);
};

module.exports = function(app){
    return new Handler(app);
};
