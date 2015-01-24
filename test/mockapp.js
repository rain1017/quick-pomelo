'use strict';

var Q = require('q');
var sinon = require('sinon');
var util = require('util');
var logger = require('pomelo-logger').getLogger('test', __filename);

/*
 * @param opts.serverId
 * @param opts.components - ['areaManager', 'areaServer']
 */
var MockApp = function(opts){
	this.serverId = opts.serverId;

	var componentNames = opts.components || ['areaManager', 'areaServer'];
	var components = {};
	componentNames.forEach(function(name){
		components[name] = null;
	});

	this.components = components;
	this.configs = {};
	this.remoteApps = [];
};

MockApp.prototype.init = function(opts){
	var self = this;
	return Q.fcall(function(){
		return self.loadComponents();
	}).then(function(){
		return self.initComponents();
	}).then(function(){
		return self.initRpc();
	});
};

MockApp.prototype.initRpc = function(){
	var self = this;
	this.rpc = {};
	this.rpc.area = {
		proxyRemote : {
			invokeAreaServer: sinon.spy(function(serverId, method, args, cb){
				var matched = false;
				self.remoteApps.forEach(function(app){
					if(app.getServerId() === serverId){
						if(matched){
							return;
						}
						matched = true;
						var areaServer = app.get('areaServer');
						Q.fcall(function(){
							return areaServer[method].apply(areaServer, args);
						}).catch(function(e){
							cb(e);
						}).then(function(ret){
							cb(null, ret);
						});
					}
				});
				if(!matched){
					cb(null);
				}
			})
		}
	};

	this.rpc.autoscaling = {
		reportRemote : {
			reportServerStatus: sinon.spy(function(route, serverId, loadAve, cb){cb();})
		}
	};
};

MockApp.prototype.loadComponents = function(){
	var self = this;
	Object.keys(this.components).forEach(function(name){
		var Cls = self.getComponentClass(name);
		self.components[name] = new Cls({app : self});
	});
};

MockApp.prototype.getComponentClass = function(name){
	if(name === 'areaManager'){
		return require('../app/components/area-manager');
	}
	else if(name === 'areaServer'){
		return require('../app/components/area-server');
	}
	else if(name === 'autoScaling'){
		return require('../app/components/autoscaling');
	}
	throw new Error('unexpected component - ' + name);
};

MockApp.prototype.initComponents = function(){
	var self = this;
	return Q.all(
		Object.keys(self.components).map(function(name){
			return Q.fcall(function(){
				return self.components[name].init();
			});
		})
	);
};

MockApp.prototype.close = function(){
	var self = this;
	return Q.all(
		Object.keys(self.components).map(function(name){
			return Q.fcall(function(){
				return self.components[name].close();
			});
		})
	);
};

MockApp.prototype.getServerId = function(){
	return this.serverId;
};

MockApp.prototype.get = function(name){
	if(this.components.hasOwnProperty(name)){
		return this.components[name];
	}
	else{
		return this.configs[name];
	}
};

MockApp.prototype.set = function(name, config){
	this.configs[name] = config;
};

MockApp.prototype.setRemoteApps = function(apps){
	this.remoteApps = apps;
};

module.exports = MockApp;

