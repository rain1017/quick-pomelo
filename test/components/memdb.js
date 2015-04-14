'use strict';

var Q = require('q');
var env = require('../env');
var quick = require('../../lib');
var logger = require('pomelo-logger').getLogger('test', __filename);

var dbConfig = env.dbConfig;
dbConfig.modelsPath = 'lib/mocks/models';

describe('memdb test', function(){
	beforeEach(env.dropDatabase.bind(null, dbConfig));
	after(env.dropDatabase.bind(null, dbConfig));

	it('load memdb / parse schema', function(cb){
		var app = quick.mocks.app({serverId : 'server1', serverType : 'area'});

		app.set('memdbConfig', dbConfig);
		app.load(quick.components.memdb);

		return Q.fcall(function(){
			return Q.ninvoke(app, 'start');
		})
		.then(function(){
			var autoconn = app.memdb.autoConnect();
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
		.fin(function(){
			return Q.ninvoke(app, 'stop');
		})
		.nodeify(cb);
	});
});
