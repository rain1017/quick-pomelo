'use strict';

var Q = require('q');

var Remote = function(app){
	this.app = app;
};

Remote.prototype.invokeAreaServer = function(method, args, cb){
	var areaServer = this.app.areaServer;

	Q.fcall(function(){
		return areaServer[method].apply(areaServer, args);
	}).then(function(ret){
		cb(null, ret);
	}, cb);
};

module.exports = function(app){
	return new Remote(app);
};
