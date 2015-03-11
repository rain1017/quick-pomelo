'use strict';

var Q = require('q');
var env = require('../env');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('area test', function(){
	beforeEach(env.dropDatabase);
	after(env.dropDatabase);

	it('area test', function(cb){
		var app = env.createApp('server1', 'area');

		return Q.fcall(function(){
			return Q.ninvoke(app, 'start');
		})
		.then(function(){
			var area = app.controllers.area;
			var autoconn = app.memorydb.autoConnect();
			return autoconn.execute(function(){
				return Q.fcall(function(){
					return area.create({_id : 'a1', name : 'area1'});
				})
				.then(function(){
					return area.remove('a1');
				});
			});
		})
		.then(function(){
			return Q.ninvoke(app, 'stop');
		})
		.nodeify(cb);
	});
});
