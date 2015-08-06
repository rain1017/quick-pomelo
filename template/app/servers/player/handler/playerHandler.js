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
    return this.app.controllers.player.createAsync(opts)
    .nodeify(next);
};

proto.remove = function(msg, session, next){
    var playerId = session.uid;
    if(!playerId){
        return next(new Error('player is not logged in'));
    }

    P.bind(this)
    .then(function(){
        return this.app.controllers.player.removeAsync(playerId);
    })
    .then(function(){
        return P.promisify(session.unbind, session)(playerId);
    })
    .nodeify(next);
};

module.exports = function(app){
    return new Handler(app);
};
