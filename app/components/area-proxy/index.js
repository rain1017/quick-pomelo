'use strict';

var Q = require('q');
var Area2ServerCache = require('./area2server-cache');
var logger = require('pomelo-logger').getLogger('area-proxy', __filename);

/**
 *
 * @param opts.app - pomelo app instance
 * @param opts.area2server - area2server component
 * @param opts.areaServer - areaServer component
 */
var AreaProxy = function(opts){
	opts = opts || {};

	this.app = opts.app;
	this.cache = new Area2ServerCache({
						area2server : opts.area2server,
						timeout : opts.cacheTimeout
					});
	this.areaServer = opts.areaServer;
};

var proto = AreaProxy.prototype;

/*
 * Invoke area api
 * Call areaServer directly if target area is in the same server,
 * otherwise call remove areaServer via rpc.
 */
proto.invoke = function(areaId, method, opts){
	var self = this;

	return Q.fcall(function(){
		return self.cache.get(areaId);
	})
	.then(function(serverId){
		if(serverId === null){
			throw new Error('Area ' + areaId + ' not exist');
		}
		else if(serverId === ''){
			throw new Error('Area ' + areaId + ' not loaded in any server');
		}
		else if(serverId === self.app.getServerId()){
			return self.areaServer.invokeArea(areaId, method, opts);
		}
		else{
			return Q.nfcall(function(cb){
				self.app.rpc.area.proxyRemote.invokeArea(serverId, areaId, method, opts, cb);
			});
		}
	});
};

module.exports = AreaProxy;
