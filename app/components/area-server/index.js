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
	this.area2server = opts.area2server;
	this.areas = {};
	this.serverId = this.app.getServerId();
};

var proto = AreaServer.prototype;

proto.init = function(){
	assert(this.state === STATE.NONE);
	this.state = STATE.INITING;

	this.onAreaJoin = this.loadArea.bind(this, this.serverId);
	this.onAreaQuit = this.releaseArea.bind(this, this.serverId);
	this.area2server.on('server:' + this.serverId + ':join', this.onAreaJoin);
	this.area2server.on('server:' + this.serverId + ':quit', this.onAreaQuit);

	this.state = STATE.RUNNING;
};

proto.close = function(){
	assert(this.state === STATE.RUNNING);
	this.state = STATE.CLOSING;

	this.area2server.removeListener('server:' + this.serverId + ':join', this.onAreaJoin);
	this.area2server.removeListener('server:' + this.serverId + ':quit', this.onAreaQuit);

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
