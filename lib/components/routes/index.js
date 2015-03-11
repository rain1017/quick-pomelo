'use strict';

var _ = require('lodash');
var path = require('path');
var logger = require('pomelo-logger').getLogger('route', __filename);
var util = require('util');
var requireChildren = require('../../utils/require-children');
var dispatcher = require('../../utils/dispatcher');

var DEFAULT_BASE_PATH = 'app/routes';

var Routes = function(app, opts){
	opts = app.get('routesConfig') || opts || {};

	this.app = app;
	this.basePath = opts.basePath || DEFAULT_BASE_PATH;
};

var proto = Routes.prototype;

proto.name = 'routes';

proto.start = function(cb){
	var basePath = path.join(this.app.getBase(), this.basePath);
	this.loadRoutes(basePath);
	cb();
};

proto.stop = function(force, cb){
	cb();
};

proto.loadRoutes = function(basePath){
	var modules = requireChildren(module, basePath);

	var self = this;
	Object.keys(modules).forEach(function(serverType){
		var route = modules[serverType];

		self.app.route(serverType, function(sessionOrParam, msg, app, cb){
			var servers = app.getServersByType(serverType);
			if(servers.length === 0){
				cb(new Error('No server for type ' + serverType));
			}

			var key = null, method = null;
			if(msg.namespace === 'sys' && msg.service === 'msgRemote' && msg.method === 'forwardMessage'){
				// handler message
				method = msg.args[0].route;
				var body = msg.args[0].body;
				if(typeof(route.handler) === 'function'){
					key = route.handler(sessionOrParam, method, body);
				}
			}
			else{
				// remote message
				if(typeof(route.remote) === 'function'){
					method = msg.serverType + '.' + msg.service + '.' + msg.method;
					key = route.remote(sessionOrParam, method, msg.args);
				}
				else{
					key = sessionOrParam;
				}
			}

			//var sessionOrParamStr = util.inspect(sessionOrParam).replace(/\n/g, ' ');

			var server = null;
			if(!key){
				server = _.sample(servers);
			}
			else{
				server = dispatcher.hashDispatch(key, servers);
			}

			var level = !!key ? 'info' : 'warn';
			logger[level]('%s %j => %s => %j', sessionOrParam, msg, key, server.id);

			cb(null, server.id);
		});
	});

	// Connector router is exception
	this.app.route('connector', function(routeParam, msg, app, cb){
		cb(null, routeParam.frontendId);
	});
};

module.exports = function(app, opts){
	var routes = new Routes(app, opts);
	return routes;
};
