'use strict';

var Q = require('q');
var path = require('path');
var logger = require('pomelo-logger').getLogger('test', __filename);

/*
 * @param opts.serverId
 * @param opts.components - {'name' : opts}
 * @param opts.rpc
 */
var App = function(opts){
	opts = opts || {};
	this.serverId = opts.serverId;
	this.serverType = opts.serverType;

	this.settings = {};
	this.components = {};
	this._routes = {};

	this._base = path.join(__dirname, '../..');
};

var proto = App.prototype;

proto.start = function(cb){
	var self = this;
	Q.fcall(function(){
		return Q.ninvoke(self, 'optComponents', 'start');
	})
	.then(function(){
		return Q.ninvoke(self, 'optComponents', 'afterStart');
	})
	.nodeify(cb);
};

proto.stop = function(force, cb){
	var self = this;
	Q.fcall(function(){
		return Q.ninvoke(self, 'optComponents', 'beforeStop');
	})
	.then(function(){
		return Q.ninvoke(self, 'stopComponents', force);
	})
	.nodeify(cb);
};

proto.load = function(component, opts){
	var instance = component(this, opts);
	this.components[instance.name] = instance;
};

proto.optComponents = function(method, cb){
	var self = this;
	Q.all(Object.keys(self.components).map(function(name){
		var component = self.components[name];
		if(typeof(component[method]) === 'function'){
			return Q.ninvoke(component, method);
		}
	}))
	.nodeify(cb);
};

proto.stopComponents = function(force, cb){
	if(typeof(force) === 'function'){
		cb = force;
		force = false;
	}

	var self = this;
	Q.all(
		Object.keys(self.components).map(function(name){
			return Q.nfcall(function(cb){
				if(typeof(self.components[name].stop) === 'function'){
					self.components[name].stop(force, cb);
				}
				else{
					cb();
				}
			});
		})
	).nodeify(cb);
};

proto.getServerId = function(){
	return this.serverId;
};

proto.getServerType = function(){
	return this.serverType;
};

proto.get = function(name){
	return this.settings[name];
};

proto.set = function(name, value, attach){
	this.settings[name] = value;
	if(attach){
		this[name] = value;
	}
};

proto.getBase = function(){
	return this._base;
};

proto.setBase = function(basePath){
	this._base = basePath;
};

proto.route = function(serverType, fn){
	this._routes[serverType] = fn;
};

proto.rpcInvoke = function(serverId, opts, cb){
	logger.info('rpcInvoke %s %j', serverId, opts);
	cb(null);
};

module.exports = function(opts){
	return new App(opts);
};

