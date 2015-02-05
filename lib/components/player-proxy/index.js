'use strict';

var Q = require('q');
var util = require('util');

var logger = require('pomelo-logger').getLogger('player-proxy', __filename);

var PlayerProxy = function(app, opts){
	opts = opts || {};
	this.app = app;
};

var proto = PlayerProxy.prototype;

proto.name = 'playerProxy';

proto.start = function(cb){
	logger.info('playerProxy started');
	cb();
};

proto.stop = function(force, cb){
	logger.info('playerProxy stoped');
	cb();
};

proto.invokeArea = function(areaId, method, args){
	return this.app.areaProxy.invokeArea(areaId, method, args);
};

proto.invokePlayer = function(playerId, method, args){
	var self = this;
	return Q.fcall(function(){
		//TODO: index cache
		return self.app.playerBackend.getPlayerOwnerId(playerId);
	}).then(function(areaId){
		return Q.fcall(function(){
		    if(!!areaId){
		    	return areaId;
		    }
		    return Q.ninvoke(self.app.rpc.allocator.quickRemote, 'joinDefaultArea', null, playerId);
		}).then(function(areaId){
		    return self.invokeArea(areaId, 'invokePlayer', [playerId, method, args]);
		});
	});
};

proto.joinArea = function(playerId, areaId){
	var self = this;
	return Q.fcall(function(){
		return self.invokeArea(areaId, 'join', [playerId]);
	}).then(function(){
		logger.info('player %s joined area %s', playerId, areaId);
	});
};

proto.quitArea = function(playerId, opts){
	var areaId = null;
	var self = this;
	return Q.fcall(function(){
		return self.app.playerBackend.getPlayerOwnerId(playerId);
	}).then(function(ret){
		areaId = ret;
		if(areaId === null){
			throw new Error('player ' + playerId + ' not joined any area');
		}
		return self.invokeArea(areaId, 'quit', [playerId, opts]);
	}).then(function(){
		logger.info('player %s quit area %s', playerId, areaId);
	});
};

module.exports = function(app, opts){
	var playerProxy = new PlayerProxy(app, opts);
	app.set(playerProxy.name, playerProxy, true);
	return playerProxy;
};
