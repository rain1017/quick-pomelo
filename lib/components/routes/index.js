'use strict';

var path = require('path');
var logger = require('pomelo-logger').getLogger('route', __filename);
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

			var key = null;
			if(msg.method === 'forwardMessage'){
				// is handler message
				key = route.handler(sessionOrParam, msg);
			}
			else{
				if(typeof(route.remote) === 'function'){
					//TODO: get args
					key = route.remote(sessionOrParam, []);
				}
				else{
					key = sessionOrParam;
				}
			}

			var server = null;
			if(key === null || key === undefined){
				server = servers[0];
				logger.warn('Can not get routing key for %j %j', sessionOrParam, msg);
			}
			else{
				server = dispatcher.hashDispath(key, servers);
			}

			logger.info('%j %j => %j', sessionOrParam, msg, server.id);
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
