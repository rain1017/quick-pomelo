'use strict';

var util = require('util');
var GlobalEventEmitter = require('global-events').EventEmitter;
var redis = require('redis');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('area-proxy', __filename);

/**
 * Area2server index
 *
 * Events:
 * 		this.on('server.[serverId].join', function(areaId){...})
 * 		this.on('server.[serverId].quit', function(areaId){...})
 * 		this.on('area.[areaId].update', function(serverId){...})
 * 		this.on('area.[areaId].remove', function(){...})
 *
 * @params opts.db - RedisClient
 * @params opts.logger - pomelo-logger
 */
var Area2Server = function(opts) {
	opts = opts || {};

	this.db = opts.db || redis.createClient();
	opts.pub = opts.pub || this.db;
	opts.sub = opts.sub || redis.createClient(this.db.connectionOption.port, this.db.connectionOption.host);

	GlobalEventEmitter.call(this, opts);
};

util.inherits(Area2Server, GlobalEventEmitter);

var proto = Area2Server.prototype;

proto.get = function(areaId){
	return Q.ninvoke(this.db, 'get', 'area2server:' + areaId);
};

proto.getAreasByServer = function(serverId){
	if(!serverId){
		serverId = '';
	}
	return Q.ninvoke(this.db, 'hkeys', 'server2areas:' + serverId);
};

/**
 * @params {String} serverId  ('' indicates no server assigned)
 */
proto.update = function(areaId, serverId){
	if(!serverId){
		serverId = '';
	}

	var self = this;
	return this.get(areaId).then(function(oldServerId){
		var multi = self.db.multi();
		if(oldServerId !== null){
			multi = multi.hdel('server2areas:' + oldServerId, areaId);
			self.emit(util.format('server:%s:quit', oldServerId), areaId);
		}

		self.emit(util.format('server:%s:join', serverId), areaId);
		self.emit(util.format('area:%s:update', areaId), serverId);
		return Q.ninvoke(multi
						.set('area2server:' + areaId, serverId)
						.hmset('server2areas:' + serverId, areaId, ''), 'exec');
	});
};

proto.add = function(areaId){
	return this.update(areaId, '');
};

proto.remove = function(areaId){
	var self = this;
	return this.get(areaId).then(function(oldServerId){
		if(oldServerId === null){
			return;
		}
		self.emit(util.format('server:%s:quit', oldServerId), areaId);
		self.emit(util.format('area:%s:remove', areaId));
		return Q.ninvoke(self.db.multi()
							.hdel('server2areas:' + oldServerId, areaId)
							.del('area2server:' + areaId), 'exec');
	});
};

module.exports = Area2Server;
