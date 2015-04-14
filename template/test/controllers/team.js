'use strict';

var Q = require('q');
var env = require('../env');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('team test', function(){
	beforeEach(env.dropDatabase);
	after(env.dropDatabase);

	it('team test', function(cb){
		var app = env.createApp('server1', 'team');

		return Q.fcall(function(){
			return Q.ninvoke(app, 'start');
		})
		.then(function(){
			var teamController = app.controllers.team;
			var playerController = app.controllers.player;
			var autoconn = app.memdb.autoConnect();
			return autoconn.execute(function(){
				var teamId = 't1', playerId = 'p1';
				return Q.fcall(function(){
					return playerController.create({_id : playerId, name : 'rain'});
				})
				.then(function(){
					return teamController.create({_id : teamId, name : 'team1'});
				})
				.then(function(){
					return teamController.join(teamId, playerId);
				})
				.then(function(){
					return teamController.getPlayers(teamId)
					.then(function(players){
						players.length.should.eql(1);
						players[0]._id.should.eql(playerId);
					});
				})
				.then(function(){
					return playerController.connect(playerId, 'c1');
				})
				.then(function(){
					return teamController.push(teamId, null, 'chat', 'hello', true);
				})
				.then(function(){
					return teamController.getMsgs(teamId, 0)
					.then(function(msgs){
						msgs.length.should.eql(1);
						msgs[0].msg.should.eql('hello');
					});
				})
				.then(function(){
					//Should automatically quit team
					return playerController.remove(playerId);
				})
				.then(function(){
					return teamController.remove(teamId);
				});
			});
		})
		.then(function(){
			return Q.ninvoke(app, 'stop');
		})
		.nodeify(cb);
	});
});
