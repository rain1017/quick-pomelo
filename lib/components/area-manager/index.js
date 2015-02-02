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
var utils = require('../../utils');
var Area = require('../area');

var STATE = {
				NONE : 0,
				STARTING : 1,
				RUNNING : 2,
				STOPING : 3,
				STOPED : 4,
			};

/**
 *
 * @event server.[serverId].join(areaId)
 * @event server.[serverId].quit(areaId)
 * @event area.[areaId].update(serverId)
 * @event area.[areaId].remove()
 * @event area.create(areaId)
 *
 * @params app - pomelo app instance
 * @params opts - {
 *				redisConfig : {host : '127.0.0.1', port : 6379},
 *				mongoConfig : {uri : 'mongodb://localhost/quick-pomelo', options : {...}},
 *				areaClasses : {name : areaClass},
 *			}
 */
var AreaManager = function(app, opts){
	this.STATE = STATE.NONE;

	this.app = app;
	opts = opts || {};

	var redisConfig = utils.config.initRedisConfig(opts.redisConfig);

	var pubClient = redis.createClient(redisConfig.port, redisConfig.host);
	var subClient = redis.createClient(redisConfig.port, redisConfig.host);
	GlobalEventEmitter.call(this, {pub : pubClient, sub: subClient});

	this.indexCache = new IndexCache({areaManager : this, timeout : opts.cacheTimeout});

	this.mongoConfig = utils.config.initMongoConfig(opts.mongoConfig);

	this.areaClasses = opts.areaClasses || {};

	this.AreaModel = null; //Model for Area.schema
	this.areaModels = {}; //{type : model} Model for inherit schemas
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
		self.AreaModel = self.mongodb.model('area', Area.schema);
		self.areaModels = {};
		for(var name in self.areaClasses){
			self.areaModels[name] = self.mongodb.model(name, self.areaClasses[name].schema);
		}
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

	var self = this;
	return Q.nfcall(function(cb){
		self.AreaModel.findById(areaId, '_server', cb);
	}).then(function(doc){
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
	return Q.nfcall(function(cb){
		self.AreaModel.update(
					{_id : areaId, _server : null},
					{'$set' : {_server : serverId}},
					cb);
	}).then(function(args){
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
	return Q.nfcall(function(cb){
		self.AreaModel.update(
					{_id : areaId, _server : serverId},
					{'$set' : {_server : null}},
					cb);
	}).then(function(args){
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
	return Q.nfcall(function(cb){
		self.AreaModel.findByIdAndUpdate(areaId,
							{'$set' : {_server : null}},
							{new : false, 'fields' : '_server'},
							cb);
	}).then(function(doc){
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
 * @param opts
 * @param areaType
 */
proto.createArea = function(opts, areaType){
	assert(this.STATE === STATE.RUNNING);
	opts = opts || {};
	if(!areaType){
		var names = Object.keys(this.areaClasses);
		if(names.length === 1){
			areaType = names[0];
		}
		else{
			throw new Error('areaType must be specified');
		}
	}
	var AreaCls = this.areaClasses[areaType];
	if(!AreaCls){
		throw new Error('Area type ' + areaType + ' not registered');
	}
	var Model = this.areaModels[areaType];

	if(!opts._id){
		opts._id = uuid.v4();
	}

	var area = new AreaCls(this.app);
	var doc = new Model();

	var self = this;
	return Q.fcall(function(){
		return area.init(opts);
	}).then(function(){
		return area.serialize(doc);
	}).then(function(){
		return Q.ninvoke(Model, 'create', doc);
	}).then(function(ret){
		self.emit('area:create', opts._id, areaType);
		logger.debug('area %s (of type %s) created', opts._id, areaType);
		return opts._id;
	}).catch(function(e){
		return area.destroy().catch(function(){
			//ignore error
		}).then(function(){
			throw e;
		});
	});
};

proto.removeArea = function(areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.quitServer(areaId, {remove : true});
	}).then(function(){
		return Q.ninvoke(self.AreaModel, 'remove', {_id : areaId, _server : null});
	}).then(function(ret){
		if(ret === 0){
			throw new Error('remove area ' + areaId + ' failed');
		}
		self.emit(util.format('area:%s:remove', areaId));
		logger.debug('area %s removed', areaId);
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

		var AreaCls = self.areaClasses[doc.__t];
		if(!AreaCls){
			throw new Error('area type ' + doc.__t + ' not registered');
		}

		var area = new AreaCls(self.app);

		return Q.fcall(function(){
			return area.deserialize(doc);
		}).then(function(){
			area._doc = doc;

			logger.debug('loaded area %s by %s', areaId, serverId);
			return area;
		});
	});
};

proto.saveArea = function(area, serverId){
	assert(this.STATE === STATE.RUNNING);

	serverId = serverId || this.app.getServerId();

	var self = this;
	return Q.fcall(function(){
		return self.ensureAcquired(area._id, serverId);
	}).then(function(){
		var doc = area._doc;

		return Q.fcall(function(){
			return area.serialize(doc);
		}).then(function(){
			//Version control, in case the area is an out of date version.
			//(http://aaronheckmann.tumblr.com/post/48943525537/mongoose-v3-part-1-versioning)
			doc.increment();

			return Q.ninvoke(doc, 'save');
		}).then(function(){
			logger.debug('saved area %s by %s', doc._id, serverId);
		});
	});
};

proto.joinServer = function(areaId, serverId){
	assert(this.STATE === STATE.RUNNING);

	return this.invokeAreaServer(serverId, 'join', [areaId]);
};

proto.quitServer = function(areaId, opts){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.indexCache.get(areaId);
	})
	.then(function(serverId){
		if(serverId === null){
			throw new Error('Area ' + areaId + ' not joined any server');
		}
		return self.invokeAreaServer(serverId, 'quit', [areaId, opts]);
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

// Expose model to external. It can be used to do area statistics
proto.getAreaModel = function(){
	assert(this.STATE === STATE.RUNNING);

	return this.AreaModel;
};

module.exports = function(app, opts){
	var areaManager = new AreaManager(app, opts);
	app.set(areaManager.name, areaManager, true);
	return areaManager;
};
