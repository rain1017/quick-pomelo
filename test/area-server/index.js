'use strict';

var env = require('../env');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('test', __filename);

var AreaManager = require('../../app/components/area-manager');
var AreaServer = require('../../app/components/area-server');

describe('areaServer test', function(){
	before(env.before);
	beforeEach(env.beforeEach);
	afterEach(env.afterEach);
	after(env.after);

	it('init/close', function(cb){
		var areaManager = new AreaManager({redisConfig : env.redisConfig});
		var fakeApp = {
			getServerId : function(){return 'server1';}
		};

		var areaServer = new AreaServer({
			areaManager : areaManager,
			app : fakeApp,
		});

		areaServer.init();
		areaServer.close();
		cb(null);
	});
});
