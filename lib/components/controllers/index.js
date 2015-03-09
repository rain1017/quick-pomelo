'use strict';

var path = require('path');
var requireDirectory = require('require-directory');
var logger = require('pomelo-logger').getLogger('controllers', __filename);

var DEFAULT_BASE_PATH = 'app/controllers';

var Controllers = function(app, opts){
	opts = opts || {};
	this._app = app;
	this._basePath = opts.basePath || DEFAULT_BASE_PATH;
};

var proto = Controllers.prototype;

proto.name = 'controllers';

proto.start = function(cb){
	var basePath = path.join(this._app.getBase(), this._basePath);
	this.loadControllers(basePath);
	cb();
};

proto.stop = function(force, cb){
	cb();
};

proto.loadControllers = function(basePath){
	var modules = requireDirectory(module, basePath, {recurse: false});

	var self = this;
	Object.keys(modules).forEach(function(name){
		if(name === 'index'){
			return;
		}
		var controller = modules[name](self._app);
		Object.defineProperty(self, name , {
			get : function(){
				return controller;
			}
		});
	});
};

module.exports = function(app, opts){
	var controllers = new Controllers(app, opts);
	app.set(controllers.name, controllers, true);
	return controllers;
};
