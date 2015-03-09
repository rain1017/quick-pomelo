'use strict';

var Remote = function(app){
	this.app = app;
};

Remote.prototype.kick = function(playerId, cb){
	this.app.get('sessionService').kick(playerId, cb);
};

module.exports = function(app){
	return new Remote(app);
};
