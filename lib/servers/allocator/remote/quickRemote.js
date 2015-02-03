'use strict';

var Q = require('q');

var Remote = function(app){
	this.app = app;
};

Remote.prototype.joinDefaultArea = function(playerId, cb){
	var allocator = this.app.defaultAreaAllocator;

	Q.fcall(function(){
		return allocator.joinDefaultArea(playerId);
	}).then(function(ret){
		cb(null, ret);
	}, cb);
};

module.exports = function(app){
	return new Remote(app);
};
