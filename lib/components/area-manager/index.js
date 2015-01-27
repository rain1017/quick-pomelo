'use strict';

var Q = require('q');
var redis = require('redis');
var mongoose = require('mongoose');
var assert = require('assert');
var util = require('util');
var uuid = require('node-uuid');
var GlobalEventEmitter = require('global-events').EventEmitter;
var logger = require('pomelo-logger').getLogger('area-manager', __filename);
var IndexCache = require('./index-cache');
var AreaSchema = require('./area-schema');

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
 * @params opts - {
 *				redisConfig : {host : '127.0.0.1', port : 6379},
 *				mongoConfig : {uri : 'mongodb://localhost/quick-pomelo', options : {...}},
 *				areaFactories : {type1 : areaFactory1, type2 : areaFactory2},
 *			}
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

	this.areaFactories = opts.areaFactories || {};
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
		//register mongo models
		self.AreaModel = self.mongodb.model('area', AreaSchema);
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

	return Q.ninvoke(this.AreaModel, 'findById', areaId, '_server')
	.then(function(doc){
		if(!doc){
			throw new Error('area ' + areaId + ' not exist');
		}
		return doc._server;
	});
};

proto.getAcquiredAreaIds = function(serverId, limit){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();
	var self = this;
	return Q.nfcall(function(cb){
		var query = self.AreaModel.find({'_server' : serverId}, '_id');
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

// Get the area 'lock': set area._server to serverId
proto.acquireArea = function(areaId, serverId){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();

	var self = this;
	return Q.ninvoke(this.AreaModel, 'update',
							{_id : areaId, _server : null},
							{'$set' : {_server : serverId}})
	.then(function(args){
		if(args[0] !== 1){
			throw new Error(util.format('%s acquire %s failed', serverId, areaId));
		}
		self.emit('server:' + serverId + ':join', areaId);
		self.emit('area:' + areaId + ':update', serverId);
		logger.debug('%s is acquired by %s', areaId, serverId);
	});
};

// Relase the area 'lock': set area._server to null
proto.releaseArea = function(areaId, serverId){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();

	var self = this;
	return Q.ninvoke(this.AreaModel, 'update',
							{_id : areaId, _server : serverId},
							{'$set' : {_server : null}})
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
	return Q.ninvoke(this.AreaModel, 'findByIdAndUpdate', areaId,
							{'$set' : {_server : null}},
							{new : false, 'fields' : '_server'})
	.then(function(doc){
		if(doc === null){
			throw new Error(util.format('area %s not exist', areaId));
		}
		self.emit('server:' + doc._server + ':quit', areaId);
		self.emit('area:' + areaId + ':update', null);
		logger.debug('%s is force released', areaId);
	});
};

// Check area._server == serverId
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

/**
 * @param areaId
 * @param areaType
 * @param doc - mongo doc to init area
 */
proto.createArea = function(areaId, areaType, doc){
	assert(this.STATE === STATE.RUNNING);

	if(!areaType){
		var names = Object.keys(this.areaFactories);
		if(names.length === 1){
			areaType = names[0];
		}
		else{
			throw new Error('areaType must be specified since there are more than one area factories');
		}
	}

	var factory = this.areaFactories[areaType];
	if(!factory){
		throw new Error('Area type ' + areaType + ' not registered');
	}
	if(!areaId){
		areaId = uuid.v4();
	}

	var area = factory(doc);

	var model = new this.AreaModel({_id : areaId, _type : areaType, data : area.toDoc()});
	var self = this;
	return Q.nfcall(function(cb){
		self.AreaModel.create(model, cb);
	}).then(function(doc){
		self.emit('area:create', areaId);
		return areaId;
	});
};

proto.removeArea = function(areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.quitServer(areaId);
	}).then(function(){
		return Q.ninvoke(self.AreaModel, 'remove', {_id : areaId, _server : null});
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
	return Q.fcall(function(){
		return Q.ninvoke(self.AreaModel, 'findById', areaId);
	}).then(function(doc){
		if(!doc){
			throw new Error('area ' + areaId + ' not exist');
		}

		var factory = self.areaFactories[doc._type];
		if(!factory){
			throw new Error('area factory ' + doc._type + ' not registered');
		}
		var area = factory(doc.data);
		//Attach internal attributes
		area._id = doc._id;
		area._type = doc._type;
		area.__v = doc.__v;

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
		return Q.nfcall(function(cb){
			var data = area.toDoc();
			self.AreaModel.update(
				{_id : area._id, __v : area.__v},
				{'$set' : {_type : area._type, __v : area.__v + 1, _server : serverId, data : data}},
				{upsert : true},
				cb);
		});
	}).then(function(args){
		if(args[0] !== 1){
			throw new Error('save area failed');
		}
		logger.debug('saved area %s by %s', area._id, serverId);
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
		var query = self.AreaModel.find({'_server' : {'$nin' : serverIds}}, '_id _server');
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
