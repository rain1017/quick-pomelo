'use strict';

var Q = require('q');
var env = require('../../env');
var logger = require('pomelo-logger').getLogger('test', __filename);

var routes = require('../../../lib/components/routes');

describe('routes test', function(){

	it('load routes', function(cb){
		var app = env.createMockApp('server1', 'area');
		app.load(routes, {basePath : 'test/mocks/routes'});

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
