'use strict';

var Q = require('q');
var util = require('util');
var sinon = require('sinon');
var logger = require('pomelo-logger').getLogger('test', __filename);
var MockChannelService = require('./mock-channelservice');

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
	this.channelService = new MockChannelService();
};

MockApp.prototype.start = function(cb){
	var self = this;
	Q.fcall(function(){
		return Q.ninvoke(self, 'startComponents');
	}).then(function(){
		return Q.ninvoke(self, 'afterStartComponents');
	}).then(function(ret){
		cb(null, ret);
	}, cb);
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
				if(typeof(self.components[name].start) === 'function'){
					self.components[name].start(cb);
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

MockApp.prototype.afterStartComponents = function(cb){
	var self = this;
	Q.all(
		Object.keys(self.components).map(function(name){
			return Q.nfcall(function(cb){
				if(typeof(self.components[name].afterStart) === 'function'){
					self.components[name].afterStart(cb);
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

