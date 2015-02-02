'use strict';

var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('area-manager', __filename);

var DEFAULT_TIMEOUT = 30 * 1000;

/**
 * Cache area2server index in local memory
 *
 * @param opts.areaManager - areaManager instance
 * @param opts.timeout - (Optional) cache timeout in ms (cache is forced to expire timely)
 */
var IndexCache = function(opts){
	opts = opts || {};
	this.areaManager = opts.areaManager;
	this.timeout = opts.timeout || DEFAULT_TIMEOUT;

	this.index = {}; //{areaId : {value : serverId, onUpdate: fn, onRemove: fn}}
};

var proto = IndexCache.prototype;

proto.get = function(areaId){
	var self = this, promise = null;

	if(this.index[areaId]){
		promise = Q.fcall(function(){
			var serverId = self.index[areaId].value;
			logger.trace('get %s->%s from cache', areaId, serverId);
			return serverId;
		});
	}
	else{
		promise = Q.fcall(function(){
			return self.areaManager.getAreaOwnerId(areaId);
		}).then(function(serverId){
			logger.trace('get %s->%s from redis', areaId, serverId);
			self._saveCache(areaId, serverId);
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
			logger.trace('onUpdate %s->%s', areaId, serverId);
			cache.value = serverId;
		},
		onRemove : function(){
			logger.trace('onRemove %s', areaId);
			self._deleteCache(areaId);
		}
	};

	this.areaManager.on(util.format('area:%s:update', areaId), cache.onUpdate);
	this.areaManager.on(util.format('area:%s:remove', areaId), cache.onRemove);
	cache.timeoutObject = setTimeout(cache.onRemove, this.timeout);

	this.index[areaId] = cache;

	logger.trace('saveCache %s -> %s', areaId, serverId);
};

proto._deleteCache = function(areaId){
	var cache = this.index[areaId];
	if(!cache){
		return;
	}

	this.areaManager.removeListener(util.format('area:%s:update', areaId), cache.onUpdate);
	this.areaManager.removeListener(util.format('area:%s:remove', areaId), cache.onRemove);
	clearTimeout(cache.timeoutObject);

	delete this.index[areaId];

	logger.trace('deleteCache %s', areaId);
};

module.exports = IndexCache;
