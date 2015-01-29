'use strict';

var util = require('util');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('room', __filename);
var Area = require('quick-pomelo').area;

var Room = function(app, doc){
	Area.call(this, app, doc);

	this.name = doc.name || 'Default Room';

	this.on('start', function(){
		logger.debug('on room start');
	});
	this.on('stop', function(){
		logger.debug('on room stop');
	});
	this.on('player.join', function(playerId){
		logger.debug('on player %s join', playerId);
	});
	this.on('player.quit', function(playerId){
		logger.debug('on player %s quit', playerId);
	});
	this.on('player.connect', function(playerId){
		logger.debug('on player %s connect', playerId);
	});
	this.on('player.disconnect', function(playerId){
		logger.debug('on player %s disconnect', playerId);
	});
};

util.inherits(Room, Area);

Room.schema = Area.schema.extend({
	name : String,
});

var proto = Room.prototype;

proto.toDoc = function(doc){
	Area.prototype.toDoc.call(this, doc);
	doc.name = this.name;
};

proto.test = function(){
	logger.debug('room.test %s', [].slice.apply(arguments));
};

module.exports = Room;
