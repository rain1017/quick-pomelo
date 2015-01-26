'use strict';

var PlayerManager = function(app, opts){
	this.app = app;
};

var proto = PlayerManager.prototype;

proto.name = 'playerManager';

proto.start = function(cb){
	cb();
};

proto.stop = function(force, cb){
	cb();
};

module.exports = function(app, opts){
	var playerManager = new PlayerManager(app, opts);
	app.set(playerManager.name, playerManager, true);
	return playerManager;
};
