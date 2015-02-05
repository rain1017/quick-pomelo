'use strict';

var Q = require('q');
var mongoose = require('mongoose');
var assert = require('assert');
var uuid = require('node-uuid');
var util = require('util');
var utils = require('../../utils');
var logger = require('pomelo-logger').getLogger('player-backend', __filename);

var STATE = {
				NONE : 0,
				STARTING : 1,
				RUNNING : 2,
				STOPING : 3,
				STOPED : 4,
			};

var PlayerBackend = function(app, opts){
	this.STATE = STATE.NONE;
	this.app = app;
	opts = opts || {};

	this.mongoConfig = utils.config.initMongoConfig(opts.mongoConfig);
	this.Player = opts.playerClass;
	this.PlayerModel = null;
};

var proto = PlayerBackend.prototype;

proto.name = 'playerBackend';

proto.start = function(cb){
	assert(this.STATE === STATE.NONE);
	this.STATE = STATE.STARTING;

	var self = this;
	Q.nfcall(function(cb){
		self.mongodb = mongoose.createConnection(self.mongoConfig.uri, self.mongoConfig.options, cb);
	}).then(function(){
		self.PlayerModel = self.mongodb.model('player', self.Player.schema);
	})
	.catch(cb)
	.then(function(){
		logger.info('playerBackend started');
		self.STATE = STATE.RUNNING;
		cb();
	});
};

proto.afterStart = function(cb){
	cb();
};

proto.stop = function(force, cb){
	assert(this.STATE === STATE.RUNNING);
	this.STATE = STATE.STOPING;

	var self = this;
	Q.nfcall(function(cb){
		self.mongodb.close(cb);
	}).then(function(){
		logger.info('playerBackend stoped');

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
	return Q.fcall(function(){
		return self.app.areaBackend.ensureAcquired(areaId);
	}).then(function(){
		return Q.nfcall(function(cb){
			self.PlayerModel.update(
						{_id : playerId, _area : null},
						{'$set' : {_area : areaId}},
						cb);
		});
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
	return Q.fcall(function(){
		return self.app.areaBackend.ensureAcquired(areaId);
	}).then(function(){
		return Q.nfcall(function(cb){
			self.PlayerModel.update(
						{_id : playerId, _area : areaId},
						{'$set' : {_area : null}},
						cb);
		});
	}).then(function(args){
		if(args[0] !== 1){
			throw new Error(util.format('release %s by %s failed', playerId, areaId));
		}
		logger.debug('%s is released by %s', playerId, areaId);
	});
};

proto.ensureAcquired = function(playerId, areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.app.areaBackend.ensureAcquired(areaId);
	}).then(function(){
		return self.getPlayerOwnerId(playerId);
	}).then(function(ret){
		if(ret !== areaId){
			throw new Error(util.format('%s not acquired %s', areaId, playerId));
		}
	});
};

// @param opts - {_id : xxx}
proto.createPlayer = function(opts){
	assert(this.STATE === STATE.RUNNING);
	var self = this;

	if(opts._id === null || opts._id === undefined){
		opts._id = uuid.v4();
	}

	var player = new this.Player(this.app);
	var doc = new self.PlayerModel();

	return Q.fcall(function(){
		return player.init(opts);
	}).then(function(){
		return player.serialize(doc);
	}).then(function(){
		return Q.ninvoke(self.PlayerModel, 'create', doc);
	}).then(function(doc){
		logger.info('player %s created', opts._id);
		return opts._id;
	}).catch(function(e){
		return player.destroy().catch(function(e){
			logger.warn(e.stack);
			//ignore error
		}).then(function(){
			throw e;
		});
	});
};

proto.removePlayer = function(playerId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.app.playerProxy.quitArea(playerId, {remove : true});
	}).then(function(){
		return Q.ninvoke(self.PlayerModel, 'remove', {_id : playerId, _area : null});
	}).then(function(ret){
		if(ret === 0){
			throw new Error('remove player ' + playerId + ' failed');
		}
		logger.info('player %s removed', playerId);
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

		var player = new self.Player(self.app);

		return Q.fcall(function(){
			return player.deserialize(doc);
		}).then(function(){
			player._doc = doc;

			logger.debug('loaded player %s by %s', playerId, areaId);
			return player;
		});
	});
};

proto.savePlayer = function(player, areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return self.ensureAcquired(player._id, areaId);
	}).then(function(){
		var doc = player._doc;

		return Q.fcall(function(){
			return player.serialize(doc);
		}).then(function(){
			if(doc.isModified()){
				//Version control, in case the area is an out of date version.
				//(http://aaronheckmann.tumblr.com/post/48943525537/mongoose-v3-part-1-versioning)
				doc.increment();

				return Q.ninvoke(doc, 'save').then(function(){
					logger.debug('saved player %s by %s', player._id, areaId);
				});
			}
			else{
				logger.debug('player %s is not changed, skip saving', player._id);
			}
		});
	});
};

// Manually update player document (Use with caution!)
proto.updatePlayer = function(player, dict, areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;
	return Q.fcall(function(){
		return Q.ninvoke(self.PlayerModel, 'update',
			{_id : player._id, __v : player._doc.__v, _area : areaId},
			{'$set' : dict});
	}).then(function(ret){
		if(ret[0] !== 1){
			throw new Error('Update player ' + player._id + ' failed');
		}
		logger.debug('updated player %s by %s', player._id, areaId);
	});
};

proto.loadAcquiredPlayers = function(areaId){
	assert(this.STATE === STATE.RUNNING);

	var self = this;

	return Q.nfcall(function(cb){
		self.PlayerModel.find({'_area' : areaId}, cb);
	}).then(function(docs){
		logger.debug('loaded acquired players by %s', areaId);

		return Q.all(docs.map(function(doc){
			var player = new self.Player(self.app);
			return Q.fcall(function(){
				return player.deserialize(doc);
			}).then(function(){
				player._doc = doc;
				return player;
			});
		}));
	});
};

proto.getPlayerModel = function(){
	assert(this.STATE === STATE.RUNNING);

	return this.PlayerModel;
};

module.exports = function(app, opts){
	var playerBackend = new PlayerBackend(app, opts);
	app.set(playerBackend.name, playerBackend, true);
	return playerBackend;
};
