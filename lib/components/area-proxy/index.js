'use strict';

var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('area-proxy', __filename);
var IndexCache = require('./index-cache');

/**
 *
 * @params app - pomelo app instance
 * @params opts.cacheTimeout
 */
var AreaProxy = function(app, opts){
	this.app = app;
	opts = opts || {};
	this.cacheTimeout = opts.cacheTimeout;
};

var proto = AreaProxy.prototype;

proto.name = 'areaProxy';

proto.start = function(cb){
	this.indexCache = new IndexCache({areaBackend : this.app.areaBackend, timeout : this.cacheTimeout});
	logger.info('areaProxy started');
	cb();
};

proto.stop = function(force, cb){
	logger.info('areaProxy stoped');
	cb();
};

proto.invokeAreaServer = function(serverId, method, args){
	var self = this;
	if(serverId === this.app.getServerId()){
		return Q.fcall(function(){
			return self.app.areaServer[method].apply(self.app.areaServer, args);
		});
	}
	else{
		return Q.nfcall(function(cb){
			self.app.rpc.area.quickRemote.invokeAreaServer(serverId, method, args, cb);
		});
	}
};

proto.invokeArea = function(areaId, method, args){
	var self = this;
	return Q.fcall(function(){
		return self.indexCache.get(areaId);
	})
	.then(function(serverId){
		if(serverId === null){
			throw new Error('Area ' + areaId + ' not loaded in any server');
		}
		return self.invokeAreaServer(serverId, 'invokeArea', [areaId, method, args]);
	});
};

proto.joinServer = function(areaId, serverId){
	var self = this;
	return Q.fcall(function(){
		return self.invokeAreaServer(serverId, 'join', [areaId]);
	}).then(function(){
		logger.info('area %s joined server %s', areaId, serverId);
	});
};

proto.quitServer = function(areaId, opts){
	var serverId = null;
	var self = this;
	return Q.fcall(function(){
		return self.indexCache.get(areaId);
	}).then(function(ret){
		serverId = ret;
		if(serverId === null){
			throw new Error('Area ' + areaId + ' not joined any server');
		}
		return self.invokeAreaServer(serverId, 'quit', [areaId, opts]);
	}).then(function(){
		logger.info('area %s quit server %s', areaId, serverId);
	});
};

module.exports = function(app, opts){
	var areaProxy = new AreaProxy(app, opts);
	app.set(areaProxy.name, areaProxy, true);
	return areaProxy;
};
