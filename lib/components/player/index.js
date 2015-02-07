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
	//this.isActive = true;
};

Player.schema = schema;

util.inherits(Player, EventEmitter);

// @param doc - mongodb document based on Player.schema
var proto = Player.prototype;

// Called before being newly created
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

// Called before being deleted
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

// Called after loading (to memory)
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

// Called before unloading (from memory)
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

// Serialize states to mongo document
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

// Parse states from mongo document
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

proto.get = function(attrs){
	var self = this;
	var dict = {};
	attrs.split(' ').forEach(function(attr){
		dict[attr] = self[attr];
	});
	return dict;
};

proto.set = function(dict){
	for(var k in dict){
		this[k] = dict[k];
	}
};

proto.toJSON = function(){
	var doc = {};
	var self = this;
	return Q.fcall(function(){
		return self.serialize(doc);
	}).then(function(){
		return JSON.stringify(doc);
	});
};

// don't know how to do it, emit it to external
proto.notify = function(route, msg){
	this.emit('notify', route, msg);
};

proto.getConnectorId = function(){
	return this._connector;
};

proto.login = function(connectorId){
	if(this._connector){
		this.disconnect();
	}
	this._connector = connectorId;
	this.emit('connect', connectorId);
	logger.debug('player %s connected', this._id);
};

proto.logout = function(){
	if(!this._connector){
		return;
	}
	this._connector = null;
	this.emit('disconnect');
	logger.debug('player %s disconnected', this._id);
};

module.exports = Player;
