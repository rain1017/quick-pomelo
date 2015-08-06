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
