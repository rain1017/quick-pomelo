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
 * @params opts.cacheTimeout - indexCache timeout
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

proto.close = function(){
	//close redis connection
	this.end();
	logger.debug('areaManager closed');
};

proto.getAreaOwnerId = function(areaId){
	return Q.ninvoke(Area, 'findById', areaId, '_serverId')
	.then(function(doc){
		if(!doc){
			throw new Error('area ' + areaId + ' not exist');
		}
		return doc._serverId;
	});
};

proto.getAcquiredAreaIds = function(serverId){
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

// Get the area 'lock': set area._serverId to serverId
proto.acquireArea = function(areaId, serverId){
	var self = this;

	return Q.ninvoke(Area, 'update',
							{_id : areaId, _serverId : null},
							{'$set' : {_serverId : serverId}})
	.then(function(args){
		if(args[0] !== 1){
			throw new Error(util.format('%s acquire %s failed', serverId, areaId));
		}
		self.emit('server:' + serverId + ':join', areaId);
		self.emit('area:' + areaId + ':update', serverId);
	});
};

// Relase the area 'lock': set area._serverId to null
proto.releaseArea = function(areaId, serverId){
	var self = this;

	return Q.ninvoke(Area, 'update',
							{_id : areaId, _serverId : serverId},
							{'$set' : {_serverId : null}})
	.then(function(args){
		if(args[0] !== 1){
			throw new Error(util.format('%s release %s failed', serverId, areaId));
		}
		self.emit('server:' + serverId + ':quit', areaId);
		self.emit('area:' + areaId + ':update', null);
	});
};

// Forcely release the area 'lock'
proto.releaseAreaForce = function(areaId){
	var self = this;
	return Q.ninvoke(Area, 'findByIdAndUpdate', areaId,
							{'$set' : {_serverId : null}},
							{new : false, 'fields' : '_serverId'})
	.then(function(doc){
		if(doc === null){
			throw new Error(util.format('area %s not exist', areaId));
		}
		self.emit('server:' + doc._serverId + ':quit', areaId);
		self.emit('area:' + areaId + ':update', null);
	});
};

// Check area._serverId == serverId
proto.ensureAcquired = function(areaId, serverId){
	return this.getAreaOwnerId(areaId).then(function(ret){
		if(ret !== serverId){
			throw new Error(util.format('%s not acquired %s', serverId, areaId));
		}
	});
};

proto.joinServer = function(areaId, serverId){
	//TODO: rpc to area server
};

proto.quitServer = function(areaId){
	//TODO: rpc to area server
};

proto.createArea = function(areaId, opts){
	var self = this;

	var area = new Area(opts);
	area._id = areaId;

	return Q.ninvoke(Area, 'create', area)
	.then(function(doc){
		self.emit(util.format('area:%s:update', areaId), doc._serverId);
		return doc;
	});
};

proto.removeArea = function(areaId){
	var self = this;

	//TODO: call quitServer first

	return Q.ninvoke(Area, 'remove', {_id : areaId, _serverId : null})
	.then(function(ret){
		if(ret === 0){
			throw new Error('remove area ' + areaId + ' failed');
		}
		self.emit(util.format('area:%s:remove', areaId));
	});
};

module.exports = AreaManager;
