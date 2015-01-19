'use strict';

var Q = require('q');

var Handler = function(app){
	this.app = app;
};

Handler.prototype.invokeArea = function(msg, session, next){
	var areaProxy = this.app.get('areaProxy');
	if(!areaProxy){
		return next(new Error('areaProxy is null'));
	}

	Q.fcall(function(){
		return areaProxy.invoke(msg.areaId, msg.method, msg.opts);
	}).then(function(ret){
		next(null, ret);
	}).catch(function(err){
		next(err);
	}).done();
};

module.exports = function(app){
	return new Handler(app);
};
