'use strict';

var Q = require('q');
var mongoose = require('mongoose');
var assert = require('assert');
var uuid = require('node-uuid');
var util = require('util');
var utils = require('../../utils');
var logger = require('pomelo-logger').getLogger('player-manager', __filename);

var STATE = {
				NONE : 0,
				STARTING : 1,
				RUNNING : 2,
				STOPING : 3,
				STOPED : 4,
			};

var PlayerManager = function(app, opts){
	this.STATE = STATE.NONE;
	this.app = app;
	opts = opts || {};

	this.mongoConfig = utils.config.initMongoConfig(opts.mongoConfig);
	this.playerSchema = opts.playerSchema;
	this.PlayerModel = null;
};

var proto = PlayerManager.prototype;

proto.name = 'playerManager';

proto.start = function(cb){
	assert(this.STATE === STATE.NONE);
	this.STATE = STATE.STARTING;

	var self = this;
	Q.nfcall(function(cb){
		self.mongodb = mongoose.createConnection(self.mongoConfig.uri, self.mongoConfig.options, cb);
	}).then(function(){
		self.PlayerModel = self.mongodb.model('player', self.playerSchema);
	})
	.catch(cb)
	.then(function(){
		logger.info('playerManager started');
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
		logger.info('playerManager stoped');

		self.STATE = STATE.STOPPED;
	}).catch(cb)
	.then(function(){
		cb();
	});
};

proto.getPlayerOwnerId = function(playerId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.nfcall(function(cb){
		self.PlayerModel.findById(playerId, '_area', cb);
	}).then(function(doc){
		if(!doc){
			throw new Error('player ' + playerId + ' not exist');
		}
		return doc._area;
	});
};

proto.getAcquiredPlayerIds = function(areaId, limit){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.nfcall(function(cb){
		var query = self.PlayerModel.find({'_area' : areaId}, '_id');
		if(limit){
			query = query.limit(limit);
		}
		query.exec(cb);
	}).then(function(docs){
		var playerIds = docs.map(function(doc){
			return doc._id;
		});
		return playerIds;
	});
};

proto.acquirePlayer = function(playerId, areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.nfcall(function(cb){
		self.PlayerModel.update(
					{_id : playerId, _area : null},
					{'$set' : {_area : areaId}},
					cb);
	}).then(function(args){
		if(args[0] !== 1){
			throw new Error(util.format('%s acquire %s failed', areaId, playerId));
		}
		logger.debug('%s is acquired by %s', playerId, areaId);
	});
};

proto.releasePlayer = function(playerId, areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.nfcall(function(cb){
		self.PlayerModel.update(
					{_id : playerId, _area : areaId},
					{'$set' : {_area : null}},
					cb);
	}).then(function(args){
		if(args[0] !== 1){
			throw new Error(util.format('%s release %s failed', areaId, playerId));
		}
		logger.debug('%s is released by %s', playerId, areaId);
	});
};

proto.ensureAcquired = function(playerId, areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return this.getPlayerOwnerId(playerId).then(function(ret){
		if(ret !== areaId){
			throw new Error(util.format('%s not acquired %s', areaId, playerId));
		}
	});
};

proto.createPlayer = function(playerId, opts){
	assert(this.STATE === STATE.RUNNING);

	if(!playerId){
		playerId = uuid.v4();
	}

	var doc = new this.PlayerModel(opts);
	doc._id = playerId;

	var self = this;
	return Q.nfcall(function(cb){
		self.PlayerModel.create(doc, cb);
	}).then(function(doc){
		logger.debug('player %s created', playerId);
		return playerId;
	});
};

proto.removePlayer = function(playerId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.quitArea(playerId);
	}).then(function(){
		return Q.ninvoke(self.PlayerModel, 'remove', {_id : playerId, _area : null});
	}).then(function(ret){
		if(ret === 0){
			throw new Error('remove player ' + playerId + ' failed');
		}
		logger.debug('player %s removed', playerId);
	});
};

proto.loadPlayer = function(playerId, areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return Q.ninvoke(self.PlayerModel, 'findById', playerId);
	}).then(function(doc){
		if(!doc){
			throw new Error('player ' + playerId + ' not exist');
		}
		logger.debug('loaded player %s by %s', playerId, areaId);
		return doc;
	});
};

proto.savePlayer = function(player, areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.ensureAcquired(player._id, areaId);
	}).then(function(){
		//Version control, in case the area is an out of date version.
		//(http://aaronheckmann.tumblr.com/post/48943525537/mongoose-v3-part-1-versioning)
		player.increment();

		return Q.ninvoke(player, 'save').then(function(){
			logger.debug('saved player %s by %s', player._id, areaId);
		});
	});
};

proto.loadAcquiredPlayers = function(areaId){
	assert(this.STATE === STATE.RUNNING);

	return Q.ninvoke(this.PlayerModel, 'find', {'_area' : areaId});
};

proto.joinArea = function(playerId, areaId){
	assert(this.STATE === STATE.RUNNING);

	return this.invokeArea(areaId, 'join', [playerId]);
};

proto.quitArea = function(playerId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.getPlayerOwnerId(playerId);
	})
	.then(function(areaId){
		if(areaId === null){
			logger.debug('player ' + playerId + ' not joined any area');
			return;
		}
		return self.invokeArea(areaId, 'quit', [playerId]);
	});
};

proto.invokeArea = function(areaId, method, args){
	assert(this.STATE === STATE.RUNNING);

	return this.app.areaManager.invokeArea(areaId, method, args);
};

proto.getPlayerModel = function(){
	assert(this.STATE === STATE.RUNNING);

	return this.PlayerModel;
};

module.exports = function(app, opts){
	var playerManager = new PlayerManager(app, opts);
	app.set(playerManager.name, playerManager, true);
	return playerManager;
};
