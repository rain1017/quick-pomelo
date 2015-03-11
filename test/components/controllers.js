'use strict';

var Q = require('q');
var env = require('../env');
var quick = require('../../lib');
var logger = require('pomelo-logger').getLogger('test', __filename);

describe('controllers test', function(){

	it('load controllers', function(cb){
		var app = quick.mocks.app({serverId : 'server1', serverType : 'area'});
		app.set('controllersConfig', {basePath : 'lib/mocks/controllers'});
		app.load(quick.components.controllers);

		return Q.fcall(function(){
			return Q.ninvoke(app, 'start');
		})
		.then(function(){
			(!!app.controllers.dummy).should.eql(true);
		})
		.fin(function(){
			return Q.ninvoke(app, 'stop');
		})
		.nodeify(cb);
	});
});
