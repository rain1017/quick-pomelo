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
