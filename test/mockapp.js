'use strict';

var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);

/*
 * @param opts.serverId
 * @param opts.components - {'name' : opts}
 * @param opts.rpc
 */
var MockApp = function(opts){
	opts = opts || {};
	this.serverId = opts.serverId;

	this.settings = {};
	this.components = {};
	this.remoteApps = [];
	this.rpc = {};
};

MockApp.prototype.start = function(cb){
	this.startComponents(cb);
};

MockApp.prototype.stop = function(force, cb){
	this.stopComponents(force, cb);
};

MockApp.prototype.load = function(component, opts){
	var instance = component(this, opts);
	this.components[instance.name] = instance;
};

MockApp.prototype.startComponents = function(cb){
	var self = this;
	Q.all(
		Object.keys(self.components).map(function(name){
			return Q.nfcall(function(cb){
				self.components[name].start(cb);
			});
		})
	).catch(function(e){
		cb(e);
	}).done(function(){
		cb();
	});
};

MockApp.prototype.stopComponents = function(force, cb){
	if(typeof(force) === 'function'){
		cb = force;
		force = false;
	}

	var self = this;
	Q.all(
		Object.keys(self.components).map(function(name){
			return Q.nfcall(function(cb){
				self.components[name].stop(force, cb);
			});
		})
	).catch(function(e){
		cb(e);
	}).done(function(){
		cb();
	});
};

MockApp.prototype.getServerId = function(){
	return this.serverId;
};

MockApp.prototype.get = function(name){
	return this.settings[name];
};

MockApp.prototype.set = function(name, value, attach){
	this.settings[name] = value;
	if(attach){
		this[name] = value;
	}
};

MockApp.prototype.setRemoteApps = function(apps){
	this.remoteApps = apps;
};

MockApp.prototype.setRpc = function(serverType, rpc){
	this.rpc[serverType] = rpc;
};

module.exports = MockApp;

