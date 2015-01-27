'use strict';

var logger = require('pomelo-logger').getLogger('test', __filename);

var Area = function(doc){
	doc = doc || {};
	this.name = doc.name || 'Default Name';
};

var proto = Area.prototype;

proto.toDoc = function(){
	return {
		name : this.name,
	};
};

proto.start = function(){
	logger.debug('area %s start', this._id);
};

proto.stop = function(){
	logger.debug('area %s stop', this._id);
};

module.exports = function(doc){
	return new Area(doc);
};
