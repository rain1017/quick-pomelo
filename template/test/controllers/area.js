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
