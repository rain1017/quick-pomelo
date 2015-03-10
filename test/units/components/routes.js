'use strict';

var Q = require('q');
var env = require('../../env');
var quick = require('../../../lib');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('routes test', function(){
	it('load routes', function(cb){
		var app = env.createMockApp('server1', 'area');
		app.load(quick.components.routes, {basePath : 'test/mocks/routes'});

		return Q.fcall(function(){
			return Q.ninvoke(app, 'start');
		})
		.then(function(){
			(!!app._routes.dummy).should.eql(true);
		})
		.fin(function(){
			return Q.ninvoke(app, 'stop');
		})
		.nodeify(cb);
	});
});
