'use strict';

var logger = require('pomelo-logger').getLogger('area-server', __filename);
var assert = require('assert');

var STATE = {
				NONE : 0,
				INITING : 1,
				RUNNING : 2,
				CLOSING : 3,
				CLOSED : 4,
			};

var AreaServer = function(opts){
	this.state = STATE.NONE;

	opts = opts || {};

	this.app = opts.app;
	this.areaManager = opts.areaManager;
	this.areas = {};
	this.serverId = this.app.getServerId();
};

var proto = AreaServer.prototype;

proto.init = function(){
	assert(this.state === STATE.NONE);
	this.state = STATE.INITING;

	this.onAreaJoin = this.loadArea.bind(this, this.serverId);
	this.onAreaQuit = this.releaseArea.bind(this, this.serverId);
	this.areaManager.on('server:' + this.serverId + ':join', this.onAreaJoin);
	this.areaManager.on('server:' + this.serverId + ':quit', this.onAreaQuit);

	this.state = STATE.RUNNING;
};

proto.close = function(){
	assert(this.state === STATE.RUNNING);
	this.state = STATE.CLOSING;

	this.areaManager.removeListener('server:' + this.serverId + ':join', this.onAreaJoin);
	this.areaManager.removeListener('server:' + this.serverId + ':quit', this.onAreaQuit);

	this.state = STATE.CLOSED;
};

proto.loadArea = function(areaId){

};

proto.saveArea = function(areaId){

};

proto.releaseArea = function(areaId){
	delete this.areas[areaId];
};

proto.invokeArea = function(areaId, method, opts){
	assert(this.state === STATE.RUNNING);

	var area = this.areas[areaId];
	if(!area){
		throw new Error('area ' + areaId + 'not exist');
	}

	return area.invoke(method, opts);
};

module.exports = AreaServer;
