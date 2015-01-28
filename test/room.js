'use strict';

var util = require('util');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('test', __filename);
var Area = require('../lib/components/area-manager/area');

var Room = function(doc){
	Area.call(this, doc);

	this.name = doc.name || 'Default Room';
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

proto.start = function(){
	var self = this;
	return Q.fcall(function(){
		return Area.prototype.start.call(self);
	}).then(function(){
		logger.debug('room start');
	});
};

proto.stop = function(){
	var self = this;
	return Q.fcall(function(){
		return Area.prototype.stop.call(self);
	}).then(function(){
		logger.debug('room start');
	});
};

proto.test = function(){
	logger.debug('room.test %s', [].slice.apply(arguments));
};

module.exports = Room;
