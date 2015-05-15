'use strict';

var P = require('bluebird');
var env = require('../env');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('team test', function(){
    beforeEach(env.dropDatabase);
    after(env.dropDatabase);

    it('team test', function(cb){
        var app = env.createApp('server1', 'team');

        return P.try(function(){
            return P.promisify(app.start, app)();
        })
        .then(function(){
            var teamController = app.controllers.team;
            var playerController = app.controllers.player;
            var goose = app.memdb.goose;
            return goose.transaction(function(){
                var teamId = 't1', playerId = 'p1';
                return P.try(function(){
                    return playerController.createAsync({_id : playerId, name : 'rain'});
                })
                .then(function(){
                    return teamController.createAsync({_id : teamId, name : 'team1'});
                })
                .then(function(){
                    return teamController.joinAsync(teamId, playerId);
                })
                .then(function(){
                    return teamController.getPlayersAsync(teamId)
                    .then(function(players){
                        players.length.should.eql(1);
                        players[0]._id.should.eql(playerId);
                    });
                })
                .then(function(){
                    return playerController.connectAsync(playerId, 'c1');
                })
                .then(function(){
                    return teamController.pushAsync(teamId, null, 'chat', 'hello', true);
                })
                .then(function(){
                    return teamController.getMsgsAsync(teamId, 0)
                    .then(function(msgs){
                        msgs.length.should.eql(1);
                        msgs[0].msg.should.eql('hello');
                    });
                })
                .then(function(){
                    //Should automatically quit team
                    return playerController.removeAsync(playerId);
                })
                .then(function(){
                    return teamController.removeAsync(teamId);
                });
            });
        })
        .then(function(){
            return P.promisify(app.stop, app)();
        })
        .nodeify(cb);
    });
});
