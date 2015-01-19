'use strict';

var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('area-proxy', __filename);

var DEFAULT_TIMEOUT = 30 * 1000;

/**
 * Cache area2server index in local memory
 *
 * @param opts.area2server - area2server instance
 * @param opts.timeout - (Optional) cache timeout in ms (cache is forced to expire timely)
 */
var Area2ServerCache = function(opts){
	opts = opts || {};
	this.area2server = opts.area2server;
	this.timeout = opts.timeout || DEFAULT_TIMEOUT;

	this.index = {}; //{areaId : {value : serverId, onUpdate: fn, onRemove: fn}}
};

var proto = Area2ServerCache.prototype;

proto.get = function(areaId){
	var self = this, promise = null;

	if(this.index[areaId]){
		promise = Q.fcall(function(){
			var serverId = self.index[areaId].value;
			logger.debug('get %s->%s from cache', areaId, serverId);
			return serverId;
		});
	}
	else{
		promise = Q.fcall(function(){
			return self.area2server.get(areaId);
		}).then(function(serverId){
			logger.debug('get %s->%s from redis', areaId, serverId);
			if(serverId !== null){
				self._saveCache(areaId, serverId);
			}
			return serverId;
		});
	}

	return promise;
};

proto._saveCache = function(areaId, serverId){
	var cache = this.index[areaId];
	if(!!cache){
		return;
	}

	var self = this;

	cache = {
		value : serverId,
		onUpdate : function(serverId){
			logger.debug('onUpdate %s->%s', areaId, serverId);
			cache.value = serverId;
		},
		onRemove : function(){
			logger.debug('onRemove %s', areaId);
			self._deleteCache(areaId);
		}
	};

	this.area2server.on(util.format('area:%s:update', areaId), cache.onUpdate);
	this.area2server.on(util.format('area:%s:remove', areaId), cache.onRemove);
	cache.timeoutObject = setTimeout(cache.onRemove, this.timeout);

	this.index[areaId] = cache;

	logger.debug('saveCache %s -> %s', areaId, serverId);
};

proto._deleteCache = function(areaId){
	var cache = this.index[areaId];
	if(!cache){
		return;
	}

	this.area2server.removeListener(util.format('area:%s:update', areaId), cache.onUpdate);
	this.area2server.removeListener(util.format('area:%s:remove', areaId), cache.onRemove);
	clearTimeout(cache.timeoutObject);

	delete this.index[areaId];

	logger.debug('deleteCache %s', areaId);
};

module.exports = Area2ServerCache;
