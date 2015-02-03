'use strict';

var util = require('util');
var logger = require('pomelo-logger').getLogger('default-area', __filename);
var Area = require('../area');

var DEFAULT_CAPACITY = 100;
var DEFAULT_TIMEOUT = 180 * 1000;
var DEFAULT_FREE_UPDATE = 2 * 1000;

/**
 * Player must join an area (load into memory) in order to be invoked
 * When user invoke a player that not in any area, it will automatically join a defaultArea.
 * Players in defaultArea which not active for a certain period will be quit to save memory.
 *
 * Tips:
 * Call playerManager.invokePlayer when to operate the single player, otherwise call areaManager.invokeArea
 * When you need to read non-realtime data (like to do some ranking), please query directly from mongodb.
 */
var DefaultArea = function(){
	Area.apply(this, [].slice.call(arguments));
};

DefaultArea.type = 'default';

DefaultArea.schema = Area.schema.extend({
	timeout : Number,
	capacity : Number,
	free: {type : Number, default: 0},
	freeUpdate : Number,
});

util.inherits(DefaultArea, Area);

var proto = DefaultArea.prototype;

proto.onInit = function(opts){
	this.capacity = opts.capacity || DEFAULT_CAPACITY;
	this.timeout = opts.timeout || DEFAULT_TIMEOUT;
	this.freeUpdate = opts.freeUpdate ||  DEFAULT_FREE_UPDATE;
};

proto.onDestroy = function(){

};

proto.onStart = function(){
	var self = this;

	this.playerTimeouts = {}; // {playerId : timeout}
	Object.keys(this.players).forEach(function(playerId){
		self.active(playerId);
	});

	//Update free count to db for querying
	this.freeUpdateInterval = setInterval(function(){
		var free = self.capacity - self.getPlayerCount();
		self.app.areaManager.updateArea(self, {free : free}).catch(function(e){
			logger.warn(e.stack);
		});
	}, this.freeUpdate);
};

proto.onStop = function(){
	for(var playerId in this.playerTimeouts){
		clearTimeout(this.playerTimeouts[playerId]);
	}
	clearInterval(this.freeUpdateInterval);
};

proto.onSerialize = function(doc){
	doc.capacity = this.capacity;
	doc.timeout = this.timeout;
	doc.free = this.capacity - this.getPlayerCount();
	doc.freeUpdate = this.freeUpdate;
};

proto.onDeserialize = function(doc){
	this.capacity = doc.capacity;
	this.timeout = doc.timeout;
	this.freeUpdate = doc.freeUpdate;
};

proto.beforeJoin = function(playerId){
	if(this.getPlayerCount() >= this.capacity){
		throw new Error('default area ' + this._id + ' is full');
	}
};

proto.beforeQuit = function(playerId){

};

proto.onJoin = function(playerId){
	this.active(playerId);
};

proto.onQuit = function(playerId){
	clearTimeout(this.playerTimeouts[playerId]);
};

// Override invokePlayer
proto.invokePlayer = function(playerId, method, args){
	this.active(playerId);
	return Area.prototype.invokePlayer.apply(this, [].slice.call(arguments));
};

proto.active = function(playerId){
	clearTimeout(this.playerTimeouts[playerId]);
	var self = this;
	this.playerTimeouts[playerId] = setTimeout(function(){
		if(!!self.players[playerId]){
			logger.debug('player %s timed out, will quit', playerId);
			self.quit(playerId);
		}
	}, this.timeout);
};

module.exports = DefaultArea;
