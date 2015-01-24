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
 * @params app - pomelo app instance
 *
 * areaManagerConfig - {host, port, cacheTimeout}
 */
var AreaManager = function(opts){
	this.app = opts.app;
	var config = this.app.get('areaManagerConfig') || {};
	var host = config.host || '127.0.0.1';
	var port = config.port || 6379;

	opts.pub = redis.createClient(port, host);
	opts.sub = redis.createClient(port, host);

	GlobalEventEmitter.call(this, opts);

	this.indexCache = new IndexCache({areaManager : this, timeout : config.cacheTimeout});
};

util.inherits(AreaManager, GlobalEventEmitter);

var proto = AreaManager.prototype;

proto.init = function(){

};

proto.close = function(){
	//close redis connection
	this.end();
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

proto.getAcquiredAreaIds = function(serverId, limit){
	serverId = serverId || this.app.getServerId();

	return Q.nfcall(function(cb){
		var query = Area.find({'_serverId' : serverId}, '_id');
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
	serverId = serverId || this.app.getServerId();

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
	serverId = serverId || this.app.getServerId();

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
	serverId = serverId || this.app.getServerId();

	var self = this;
	return this.getAreaOwnerId(areaId).then(function(ret){
		if(ret !== serverId){
			throw new Error(util.format('%s not acquired %s', serverId, areaId));
		}
	});
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

proto.loadArea = function(areaId, serverId){
	serverId = serverId || this.app.getServerId();

	var self = this;
	return Q.ninvoke(Area, 'findById', areaId).then(function(area){
		if(!area){
			throw new Error('area ' + areaId + ' not exist');
		}
		logger.debug('loaded area %s by %s', areaId, serverId);
		return area;
	});
};

proto.saveArea = function(area, serverId){
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
	return this.invokeAreaServer(serverId, 'join', [areaId]);
};

proto.quitServer = function(areaId){
	var self = this;
	return Q.fcall(function(){
		return self.indexCache.get(areaId);
	})
	.then(function(serverId){
		if(serverId === null){
			throw new Error('Area ' + areaId + ' not loaded in any server');
		}
		return self.invokeAreaServer(serverId, 'quit', [areaId]);
	});
};

proto.invokeAreaServer = function(serverId, method, args){
	var self = this;

	if(serverId === this.app.getServerId()){
		var areaServer = self.app.get('areaServer');
		return Q.fcall(function(){
			return areaServer[method].apply(areaServer, args);
		});
	}
	else{
		return Q.nfcall(function(cb){
			self.app.rpc.area.proxyRemote.invokeAreaServer(serverId, method, args, cb);
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
		return self.invokeAreaServer(serverId, 'invokeArea', [method, args]);
	});
};

proto.getAreasNotInServers = function(serverIds, limit){
	return Q.nfcall(function(cb){
		var query = Area.find({'_serverId' : {'$nin' : serverIds}}, '_id _serverId');
		if(limit){
			query = query.limit(limit);
		}
		return query.exec(cb);
	});
};

module.exports = AreaManager;
