'use strict';

var env = require('../env');
var quick = require('quick-pomelo');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);

describe('player test', function(){
    beforeEach(function(cb){
        env.initMemdb().nodeify(cb);
    });
    afterEach(function(cb){
        env.closeMemdb().nodeify(cb);
    });

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
