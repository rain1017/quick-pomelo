// Copyright 2015 rain1017.
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

var env = require('../env');
var quick = require('quick-pomelo');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);

describe('player test', function(){
    beforeEach(env.initMemdbSync);
    afterEach(env.closeMemdbSync);

    it('create/remove/connect/disconnect', function(cb){
        var app = env.createApp('player-server-1', 'player');

        return P.try(function(){
            return P.promisify(app.start, app)();
        })
        .then(function(){
            var playerController = app.controllers.player;
            var area = app.controllers.area;

            var goose = app.memdb.goose;
            return goose.transaction(function(){
                var playerId = null;
                return P.try(function(){
                    return playerController.createAsync({name : 'rain'});
                })
                .then(function(ret){
                    playerId = ret;
                    return playerController.connectAsync(playerId, 'c1');
                })
                .then(function(){
                    return playerController.pushAsync(playerId, 'notify', 'content', true);
                })
                .then(function(){
                    return playerController.getMsgsAsync(playerId, 0)
                    .then(function(ret){
                        ret.length.should.eql(1);
                        ret[0].msg.should.eql('content');
                    });
                })
                .then(function(){
                    return playerController.disconnectAsync(playerId);
                })
                .then(function(){
                    return playerController.removeAsync(playerId);
                });
            }, app.getServerId());
        })
        .then(function(){
            return P.promisify(app.stop, app)();
        })
        .nodeify(cb);
    });
});
