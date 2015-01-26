'use strict';

var Q = require('q');
var redis = require('redis');
var mongoose = require('mongoose');
var assert = require('assert');
var util = require('util');
var GlobalEventEmitter = require('global-events').EventEmitter;
var logger = require('pomelo-logger').getLogger('area-manager', __filename);
var IndexCache = require('./index-cache');
var areaSchema = require('./area');

var STATE = {
				NONE : 0,
				STARTING : 1,
				RUNNING : 2,
				STOPING : 3,
				STOPED : 4,
			};

/**
 *
 * Events:
 * 		this.on('server.[serverId].join', function(areaId){...})
 * 		this.on('server.[serverId].quit', function(areaId){...})
 * 		this.on('area.[areaId].update', function(serverId){...})
 * 		this.on('area.[areaId].remove', function(){...})
 *		this.on('area.create', function(areaId){...})
 *
 * @params app - pomelo app instance
 *
 * areaManagerConfig - {redisConfig, mongoConfig, cacheTimeout}
 */
var AreaManager = function(app, opts){
	this.STATE = STATE.NONE;

	this.app = app;
	opts = opts || {};

	var redisConfig = opts.redisConfig || {};
	redisConfig.host = redisConfig.host || '127.0.0.1';
	redisConfig.port = redisConfig.port || 6379;

	var pubClient = redis.createClient(redisConfig.port, redisConfig.host);
	var subClient = redis.createClient(redisConfig.port, redisConfig.host);
	GlobalEventEmitter.call(this, {pub : pubClient, sub: subClient});

	this.indexCache = new IndexCache({areaManager : this, timeout : opts.cacheTimeout});

	var mongoConfig = opts.mongoConfig || {};
	var uri = mongoConfig.uri || 'mongodb://localhost/quick-pomelo';
	var options = mongoConfig.options || {};

	//set keepAlive (http://mongoosejs.com/docs/connections.html)
	options.server = options.server || {};
	options.server.socketOptions = options.server.socketOptions || {};
	options.server.socketOptions.keepAlive = 1;

	this.mongoConfig = mongoConfig;
};

util.inherits(AreaManager, GlobalEventEmitter);

var proto = AreaManager.prototype;

proto.name = 'areaManager';

proto.start = function(cb){
	assert(this.STATE === STATE.NONE);
	this.STATE = STATE.STARTING;

	var self = this;
	Q.nfcall(function(cb){
		self.mongodb = mongoose.createConnection(self.mongoConfig.uri, self.mongoConfig.options, cb);
	}).then(function(){
		self.Area = self.mongodb.model('area', areaSchema);
	})
	.catch(cb)
	.then(function(){
		logger.info('areaManager started');
		self.STATE = STATE.RUNNING;
		cb();
	});
};

proto.stop = function(force, cb){
	assert(this.STATE === STATE.RUNNING);
	this.STATE = STATE.STOPING;

	var self = this;
	Q.nfcall(function(cb){
		self.mongodb.close(cb);
	}).then(function(){
		//close redis connection
		self.end();
	}).then(function(){
		logger.info('areaManager stoped');

		self.STATE = STATE.STOPPED;
	}).catch(cb)
	.then(function(){
		cb();
	});
};

proto.getAreaOwnerId = function(areaId){
	assert(this.STATE === STATE.RUNNING);

	return Q.ninvoke(this.Area, 'findById', areaId, '_serverId')
	.then(function(doc){
		if(!doc){
			throw new Error('area ' + areaId + ' not exist');
		}
		return doc._serverId;
	});
};

proto.getAcquiredAreaIds = function(serverId, limit){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();
	var self = this;
	return Q.nfcall(function(cb){
		var query = self.Area.find({'_serverId' : serverId}, '_id');
		if(limit){
			query = query.limit(limit);
		}
		query.exec(cb);
	}).then(function(docs){
		var areaIds = docs.map(function(doc){
			return doc._id;
		});
		return areaIds;
	});
};

// Get the area 'lock': set area._serverId to serverId
proto.acquireArea = function(areaId, serverId){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();

	var self = this;
	return Q.ninvoke(this.Area, 'update',
							{_id : areaId, _serverId : null},
							{'$set' : {_serverId : serverId}})
	.then(function(args){
		if(args[0] !== 1){
			throw new Error(util.format('%s acquire %s failed', serverId, areaId));
		}
		self.emit('server:' + serverId + ':join', areaId);
		self.emit('area:' + areaId + ':update', serverId);
		logger.debug('%s is acquired by %s', areaId, serverId);
	});
};

// Relase the area 'lock': set area._serverId to null
proto.releaseArea = function(areaId, serverId){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();

	var self = this;
	return Q.ninvoke(this.Area, 'update',
							{_id : areaId, _serverId : serverId},
							{'$set' : {_serverId : null}})
	.then(function(args){
		if(args[0] !== 1){
			throw new Error(util.format('%s release %s failed', serverId, areaId));
		}
		self.emit('server:' + serverId + ':quit', areaId);
		self.emit('area:' + areaId + ':update', null);
		logger.debug('%s is released by %s', areaId, serverId);
	});
};

// Forcely release the area 'lock'
proto.releaseAreaForce = function(areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.ninvoke(this.Area, 'findByIdAndUpdate', areaId,
							{'$set' : {_serverId : null}},
							{new : false, 'fields' : '_serverId'})
	.then(function(doc){
		if(doc === null){
			throw new Error(util.format('area %s not exist', areaId));
		}
		self.emit('server:' + doc._serverId + ':quit', areaId);
		self.emit('area:' + areaId + ':update', null);
		logger.debug('%s is force released', areaId);
	});
};

// Check area._serverId == serverId
proto.ensureAcquired = function(areaId, serverId){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();

	var self = this;
	return this.getAreaOwnerId(areaId).then(function(ret){
		if(ret !== serverId){
			throw new Error(util.format('%s not acquired %s', serverId, areaId));
		}
	});
};

proto.createArea = function(areaId, opts){
	assert(this.STATE === STATE.RUNNING);

	var area = new this.Area(opts);

	area._id = areaId;
	var self = this;
	return Q.ninvoke(this.Area, 'create', area)
	.then(function(doc){
		self.emit('area:create', areaId);
		return doc;
	});
};

proto.removeArea = function(areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.quitServer(areaId);
	}).then(function(){
		return Q.ninvoke(self.Area, 'remove', {_id : areaId, _serverId : null});
	}).then(function(ret){
		if(ret === 0){
			throw new Error('remove area ' + areaId + ' failed');
		}
		self.emit(util.format('area:%s:remove', areaId));
	});
};

proto.loadArea = function(areaId, serverId){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();

	var self = this;
	return Q.ninvoke(this.Area, 'findById', areaId).then(function(area){
		if(!area){
			throw new Error('area ' + areaId + ' not exist');
		}
		logger.debug('loaded area %s by %s', areaId, serverId);
		return area;
	});
};

proto.saveArea = function(area, serverId){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();

	var self = this;
	return Q.fcall(function(){
		return self.ensureAcquired(area._id, serverId);
	}).then(function(){
		//Version control, incase the area is an out of date version.
		//(http://aaronheckmann.tumblr.com/post/48943525537/mongoose-v3-part-1-versioning)
		area.increment();

		return Q.ninvoke(area, 'save').then(function(){
			logger.debug('saved area %s by %s', area._id, serverId);
		});
	});
};

proto.joinServer = function(areaId, serverId){
	assert(this.STATE === STATE.RUNNING);

	return this.invokeAreaServer(serverId, 'join', [areaId]);
};

proto.quitServer = function(areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.indexCache.get(areaId);
	})
	.then(function(serverId){
		if(serverId === null){
			logger.debug('Area ' + areaId + ' not loaded to any server');
			return;
		}
		return self.invokeAreaServer(serverId, 'quit', [areaId]);
	});
};

proto.invokeAreaServer = function(serverId, method, args){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	if(serverId === this.app.getServerId()){
		return Q.fcall(function(){
			return self.app.areaServer[method].apply(self.app.areaServer, args);
		});
	}
	else{
		return Q.nfcall(function(cb){
			self.app.rpc.area.proxyRemote.invokeAreaServer(serverId, method, args, cb);
		});
	}
};

proto.invokeArea = function(areaId, method, args){
	assert(this.STATE === STATE.RUNNING);

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

proto.getAreasNotInServers = function(serverIds, limit){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.nfcall(function(cb){
		var query = self.Area.find({'_serverId' : {'$nin' : serverIds}}, '_id _serverId');
		if(limit){
			query = query.limit(limit);
		}
		return query.exec(cb);
	});
};

module.exports = function(app, opts){
	var areaManager = new AreaManager(app, opts);
	app.set(areaManager.name, areaManager, true);
	return areaManager;
};
