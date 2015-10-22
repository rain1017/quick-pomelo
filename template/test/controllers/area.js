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

describe('area test', function(){
    beforeEach(env.initMemdbSync);
    afterEach(env.closeMemdbSync);

    it('area test', function(cb){
        var app = env.createApp('area-server-1', 'area');

        return P.try(function(){
            return P.promisify(app.start, app)();
        })
        .then(function(){
            var areaController = app.controllers.area;
            var playerController = app.controllers.player;
            var goose = app.memdb.goose;
            return goose.transaction(function(){
                var areaId = 'a1', playerId = 'p1';
                return P.try(function(){
                    return playerController.createAsync({_id : playerId, name : 'rain'});
                })
                .then(function(){
                    return areaController.createAsync({_id : areaId, name : 'area1'});
                })
                .then(function(){
                    return areaController.joinAsync(areaId, playerId);
                })
                .then(function(){
                    return areaController.getPlayersAsync(areaId)
                    .then(function(players){
                        players.length.should.eql(1);
                        players[0]._id.should.eql(playerId);
                    });
                })
                .then(function(){
                    return playerController.connectAsync(playerId, 'c1');
                })
                .then(function(){
                    return areaController.pushAsync(areaId, null, 'chat', 'hello', true);
                })
                .then(function(){
                    return areaController.getMsgsAsync(areaId, 0)
                    .then(function(msgs){
                        msgs.length.should.eql(1);
                        msgs[0].msg.should.eql('hello');
                    });
                })
                .then(function(){
                    //Should automatically quit area
                    return playerController.removeAsync(playerId);
                })
                .then(function(){
                    return areaController.removeAsync(areaId);
                });
            }, app.getServerId());
        })
        .then(function(){
            return P.promisify(app.stop, app)();
        })
        .nodeify(cb);
    });
});
