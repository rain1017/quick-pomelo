'use strict';

var fs = require('fs');
var path = require('path');

var Controllers = function(app, opts){
	opts = opts || {};
	this._app = app;
};

var proto = Controllers.prototype;

proto.name = 'controllers';

proto.start = function(cb){
	var basePath = path.join(this.app.getBase(), 'app/controllers');
	this.loadControllers(basePath);
	cb();
};

proto.stop = function(force, cb){
	cb();
};

proto.loadControllers = function(basePath){
	var self = this;
	fs.readdirSync(basePath).forEach(function(name){
		var modulePath = path.join(basePath, name);
		self.loadController(modulePath, name);
	});
};

proto.loadController = function(modulePath, name){
	var m = require(modulePath);
	var controller = m(this._app);

	Object.defineProperty(this, name , {
		get : function(){
			return controller;
		}
	});
};

module.exports = function(app, opts){
	var controllers = new Controllers(app, opts);
	app.set(controllers.name, controllers, true);
};
