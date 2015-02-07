'use strict';

var Q = require('q');
var utils = require('../../../utils');

var Remote = function(app){
	this.app = app;
};

Remote.prototype.kick = function(playerId, cb){
	this.app.get('sessionService').kick(playerId, cb);

	var self = this;
	utils.flow.wait(function(){
		return self.app.playerProxy.invokePlayer(playerId, 'get', '_connector')
		.then(function(connectorId){
			return !connectorId;
		});
	}, 200, 2000)
	.then(function(){
		cb();
	}, cb);
};

module.exports = function(app){
	return new Remote(app);
};
