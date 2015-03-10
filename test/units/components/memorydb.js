'use strict';

var Q = require('q');
var env = require('../../env');
var quick = require('../../../lib');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('memorydb test', function(){
	beforeEach(env.cleardb);
	after(env.cleardb);

	it('load memorydb / parse schema', function(cb){
		var app = env.createMockApp('server1', 'area');
		var config = env.memorydbConfig();
		config.modelsPath = 'test/mocks/models';

		app.set('memorydbConfig', config);
		app.load(quick.components.memorydb);

		return Q.fcall(function(){
			return Q.ninvoke(app, 'start');
		})
		.then(function(){
			var autoconn = app.memorydb.autoConnect();
			return autoconn.execute(function(){
				return Q.fcall(function(){
					var dummy = new app.models.Dummy({_id : 'd1', name : 'dummy', groupId : 'g1'});
					return dummy.saveQ();
				})
				.then(function(){
					return app.models.Dummy.findByIndexQ('groupId', 'g1');
				})
				.then(function(dummys){
					dummys.length.should.eql(1);
					dummys[0].groupId.should.eql('g1');
					dummys[0].name.should.eql('dummy');

					return dummys[0].removeQ();
				});
			});
		})
		.then(function(){
			return Q.ninvoke(app, 'stop');
		})
		.nodeify(cb);
	});
});
