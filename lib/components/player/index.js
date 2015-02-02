'use strict';

var Q = require('q');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var logger = require('pomelo-logger').getLogger('player', __filename);
var schema = require('./schema');

/**
 *
 * @event: connect
 * @event: disconnect
 * @event: notify
 *
 */
var Player = function(app){
	EventEmitter.call(this);
	this.app = app;
};

Player.schema = schema;

util.inherits(Player, EventEmitter);

// @param doc - mongodb document based on Player.schema
var proto = Player.prototype;

proto.init = function(opts){
	opts = opts || {};
	this._id = opts._id;
	this._connector = null;

	var self = this;
	return Q.fcall(function(){
		if(typeof(self.onInit) === 'function'){
			return self.onInit(opts);
		}
	}).then(function(){
		logger.debug('player %s inited', self._id);
	});
};

proto.destroy = function(){
	var self = this;
	return Q.fcall(function(){
		if(typeof(self.onDestroy) === 'function'){
			return self.onDestroy();
		}
	}).then(function(){
		logger.debug('player %s destroyed', self._id);
	});
};

proto.start = function(){
	var self = this;
	return Q.fcall(function(){
		if(typeof(self.onStart) === 'function'){
			return self.onStart();
		}
	}).then(function(){
		logger.debug('player %s started', self._id);
	});
};

proto.stop = function(){
	var self = this;
	return Q.fcall(function(){
		if(typeof(self.onStop) === 'function'){
			return self.onStop();
		}
	}).then(function(){
		logger.debug('player %s stoped', self._id);
	});
};

proto.serialize = function(doc){
	doc._id = this._id;
	doc._connector = this._connector;

	var self = this;
	return Q.fcall(function(){
		if(typeof(self.onSerialize) === 'function'){
			return self.onSerialize(doc);
		}
	}).then(function(){
		logger.debug('player %s serialized', self._id);
	});
};

proto.deserialize = function(doc){
	this._id = doc._id;
	this._connector = doc._connector;

	var self = this;
	return Q.fcall(function(){
		if(typeof(self.onDeserialize) === 'function'){
			return self.onDeserialize(doc);
		}
	}).then(function(){
		logger.debug('player %s deserialized', self._id);
	});
};

// don't know how to do it, emit it to external
proto.notify = function(route, msg){
	this.emit('notify', route, msg);
};

proto.isConnected = function(){
	return this._connector;
};

proto.connect = function(connectorId){
	if(this._connector){
		this.disconnect();
	}
	this._connector = connectorId;
	this.emit('connect', connectorId);
	logger.debug('player %s connected', this._id);
};

proto.disconnect = function(){
	if(!this._connector){
		return;
	}
	this._connector = null;
	this.emit('disconnect');
	logger.debug('player %s disconnected', this._id);
};

module.exports = Player;
