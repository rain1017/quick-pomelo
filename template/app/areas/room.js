'use strict';

var logger = require('pomelo-logger').getLogger('area', __filename);

var Room = function(doc){
	doc = doc || {};
	this.name = doc.name || '';
};

var proto = Room.prototype;

proto.toDoc = function(){
	return {
		name : this.name,
	};
};

proto.start = function(){
	logger.debug('room %s start', this._id);
};

proto.stop = function(){
	logger.debug('room %s stop', this._id);
};

proto.test = function(){
	logger.debug('room.test %s', [].slice.apply(arguments));
}

module.exports = function(doc){
	return new Room(doc);
};
