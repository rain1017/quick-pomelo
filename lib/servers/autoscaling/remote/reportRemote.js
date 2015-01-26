'use strict';

var Q = require('q');

var Remote = function(app){
	this.app = app;
};

/*
 *
 */
Remote.prototype.reportServerStatus = function(serverId, loadAve, cb){
	var autoScaling = this.app.get('autoScaling');

	Q.fcall(function(){
		return autoScaling.reportServerStatus(serverId, loadAve);
	}).then(function(ret){
		cb(null, ret);
	}).catch(function(err){
		cb(err);
	}).done();
};

module.exports = function(app){
	return new Remote(app);
};
