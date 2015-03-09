'use strict';

var Q = require('q');
var path = require('path');
var logger = require('pomelo-logger').getLogger('test', __filename);

/*
 * @param opts.serverId
 * @param opts.components - {'name' : opts}
 * @param opts.rpc
 */
var MockApp = function(opts){
	opts = opts || {};
	this.serverId = opts.serverId;
	this.serverType = opts.serverType;

	this.settings = {};
	this.components = {};
	this.remoteApps = [];
	this.rpc = {};
};

MockApp.prototype.start = function(cb){
	var self = this;
	Q.fcall(function(){
		return Q.ninvoke(self, 'optComponents', 'start');
	}).then(function(){
		return Q.ninvoke(self, 'optComponents', 'afterStart');
	}).then(function(ret){
		cb(null, ret);
	}, cb);
};

MockApp.prototype.stop = function(force, cb){
	var self = this;
	Q.fcall(function(){
		return Q.ninvoke(self, 'optComponents', 'beforeStop');
	}).then(function(){
		return Q.ninvoke(self, 'stopComponents', force);
	}).then(function(ret){
		cb(null, ret);
	}, cb);
};

MockApp.prototype.load = function(component, opts){
	var instance = component(this, opts);
	this.components[instance.name] = instance;
};

MockApp.prototype.optComponents = function(method, cb){
	var self = this;
	Q.all(
		Object.keys(self.components).map(function(name){
			return Q.nfcall(function(cb){
				if(typeof(self.components[name][method]) === 'function'){
					self.components[name][method](cb);
				}
				else{
					cb();
				}
			});
		})
	).then(function(){
		cb();
	}).catch(cb);
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
				if(typeof(self.components[name].stop) === 'function'){
					self.components[name].stop(force, cb);
				}
				else{
					cb();
				}
			});
		})
	).then(function(){
		cb();
	}).catch(cb);
};

MockApp.prototype.getServerId = function(){
	return this.serverId;
};

MockApp.prototype.getServerType = function(){
	return this.serverType;
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

MockApp.prototype.getBase = function(){
	return path.join(__dirname, '../..');
};

MockApp.prototype.setRemoteApps = function(apps){
	if(!(apps instanceof Array)){
		apps = [apps];
	}
	this.remoteApps = apps;
};

MockApp.prototype.setRpc = function(serverType, rpc){
	this.rpc[serverType] = rpc;
};

MockApp.prototype.getRemoteApp = function(serverId){
	for(var i in this.remoteApps){
		if(this.remoteApps[i].getServerId() === serverId){
			return this.remoteApps[i];
		}
	}
};

MockApp.prototype.getRemoteAppsByType = function(serverType){
	var apps = [];
	for(var i in this.remoteApps){
		if(this.remoteApps[i].getServerType() === serverType){
			apps.push(this.remoteApps[i]);
		}
	}
	return apps;
};

module.exports = MockApp;

