'use strict';
var logger = require('pomelo-logger').getLogger('connector', __filename);

var Remote = function(app){
	this.app = app;
};

Remote.prototype.kick = function(playerId, cb){
	logger.warn('kicking %s', playerId);

	//TODO: unbind instead of kick
	this.app.get('sessionService').kick(playerId, cb);
};

module.exports = function(app){
	return new Remote(app);
};
