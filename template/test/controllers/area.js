'use strict';

var P = require('bluebird');
var env = require('../env');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('area test', function(){
	beforeEach(env.dropDatabase);
	after(env.dropDatabase);

	it('area test', function(cb){
		var app = env.createApp('server1', 'area');

		return P.try(function(){
			return P.promisify(app.start, app)();
		})
		.then(function(){
			var areaController = app.controllers.area;
			var playerController = app.controllers.player;
			var autoconn = app.memdb.autoConnect();
			return autoconn.execute(function(){
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
			});
		})
		.then(function(){
			return P.promisify(app.stop, app)();
		})
		.nodeify(cb);
	});
});
