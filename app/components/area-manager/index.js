'use strict';

var redis = require('redis');
var util = require('util');
var Q = require('q');
var GlobalEventEmitter = require('global-events').EventEmitter;
var logger = require('pomelo-logger').getLogger('area-manager', __filename);
var Area = require('../area');
var IndexCache = require('./index-cache');

/**
 *
 * Events:
 * 		this.on('server.[serverId].join', function(areaId){...})
 * 		this.on('server.[serverId].quit', function(areaId){...})
 * 		this.on('area.[areaId].update', function(serverId){...})
 * 		this.on('area.[areaId].remove', function(){...})
 *
 * @params opts.redisConfig - {host : '127.0.0.1', port : 6379}
 *
 */
var AreaManager = function(opts){
	opts = opts || {};

	var host = opts.redisConfig && opts.redisConfig.host ? opts.redisConfig.host : '127.0.0.1';
	var port = opts.redisConfig && opts.redisConfig.port ? opts.redisConfig.port : 6379;

	opts.pub = redis.createClient(port, host);
	opts.sub = redis.createClient(port, host);

	GlobalEventEmitter.call(this, opts);

	this.indexCache = new IndexCache({areaManager : this, timeout : opts.cacheTimeout});
};

util.inherits(AreaManager, GlobalEventEmitter);

var proto = AreaManager.prototype;

proto.getServerIdByAreaId = function(areaId){
	return Q.ninvoke(Area, 'findById', areaId, '_serverId')
	.then(function(doc){
		return doc ? doc._serverId : null;
	});
};

proto.getAreaIdsByServerId = function(serverId){
	if(!serverId){
		serverId = '';
	}

	return Q.ninvoke(Area, 'find', {'_serverId' : serverId}, '_id')
	.then(function(docs){
		var areaIds = [];
		docs.forEach(function(doc){
			areaIds.push(doc._id);
		});
		return areaIds;
	});
};

proto.updateServerId = function(areaId, serverId){
	if(!serverId){
		serverId = '';
	}

	var self = this;

	return Q.ninvoke(Area, 'findByIdAndUpdate', areaId,
								{'$set' : {'_serverId' : serverId}},
								{new : false, 'fields' : '_serverId'})
	.then(function(doc){
		if(doc === null){
			logger.warn('area %s not exist', areaId);
			return;
		}
		self.emit(util.format('server:%s:quit', doc._serverId), areaId);
		self.emit(util.format('server:%s:join', serverId), areaId);
		self.emit(util.format('area:%s:update', areaId), serverId);
	});
};

proto.createArea = function(areaId, opts){
	var self = this;

	var area = new Area(opts);
	area._id = areaId;

	return Q.ninvoke(Area, 'create', area)
	.then(function(doc){
		self.emit(util.format('server:%s:join', doc._serverId), areaId);
		self.emit(util.format('area:%s:create', areaId));
		self.emit(util.format('area:%s:update', areaId), doc._serverId);
		return doc;
	});
};

proto.removeArea = function(areaId){
	var self = this;

	return Q.ninvoke(Area, 'findByIdAndRemove', areaId, {'select' : '_serverId'})
	.then(function(doc){
		if(doc === null){
			logger.warn('area %s not exist', areaId);
			return;
		}
		self.emit(util.format('server:%s:quit', doc._serverId), areaId);
		self.emit(util.format('area:%s:remove', areaId));
	});
};

module.exports = AreaManager;
