'use strict';

var Remote = function(app){
	this.app = app;
};

Remote.prototype.invokeArea = function(areaId, method, opts, cb){
	var areaServer = this.app.get('areaServer');
	if(!areaServer){
		return cb(new Error('areaServer is null'));
	}

	areaServer.invokeArea(areaId, method, opts).then(function(ret){
		cb(null, ret);
	}).catch(function(err){
		cb(err);
	}).done();
};

module.exports = function(app){
	return new Remote(app);
};
