'use strict';

var Q = require('q');

var Handler = function(app){
	this.app = app;
};

Handler.prototype.invokeAreaManager = function(msg, session, next){
	var areaManager = this.app.get('areaManager');

	var method = msg.method;
	var args = msg.args;

	Q.fcall(function(){
		return areaManager[method].apply(areaManager, args);
	}).then(function(ret){
		next(null, ret);
	}).catch(function(err){
		next(err);
	}).done();
};

module.exports = function(app){
	return new Handler(app);
};
