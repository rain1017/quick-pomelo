'use strict';

var util = require('util');
var Q = require('q');
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

//	init code

	this.state = STATE.RUNNING;
};

proto.close = function(){
	assert(this.state === STATE.RUNNING);
	this.state = STATE.CLOSING;

//	finalize code

	this.state = STATE.CLOSED;
};

/*
 * Sync areas assignment from manager
 * Called when connect to cluster
 */
proto.syncAcquiredAreas = function(){
	assert(this.state === STATE.RUNNING);

	var self = this;
	return this.areaManager.getAcquiredAreaIds(this.serverId).then(function(areaIds){
		var areaIdMap = {};
		areaIds.forEach(function(areaId){
			areaIdMap[areaId] = true;
		});

		var promises = [];

		areaIds.forEach(function(areaId){
			if(!self.areas[areaId]){
				// release area lock if area is acquired but not loaded
				promises.push(self.areaManager.releaseArea(areaId, self.serverId));
			}
		});

		Object.keys(self.areas).forEach(function(areaId){
			if(!areaIdMap[areaId]){
				// force unload area if area is loaded but not acquired
				promises.push(self.quit(areaId, true));
			}
		});

		return Q.all(promises);
	});
};

proto.join = function(areaId){
	assert(this.state === STATE.RUNNING);
	var self = this;

	return Q.fcall(function(){
		return self.areaManager.acquireArea(areaId, self.serverId);
	}).then(function(){
		return Q.fcall(function(){
			return self.areaManager.loadArea(areaId, self.serverId);
		}).then(function(area){
			self.areas[areaId] = area;
			logger.debug('area %s joined server %s', areaId, self.serverId);
		}).catch(function(e){
			self.areaManager.releaseArea(areaId, self.serverId).catch(function(e){
				logger.warn(e);
			});
			throw e;
		});
	});
};

/*
 *
 * @param force - force unload without save
 */
proto.quit = function(areaId, force){
	assert(this.state === STATE.RUNNING);

	var area = this.areas[areaId];
	if(!area){
		throw new Error('area ' + areaId + ' not in server ' + this.serverId);
	}

	if(force){
		delete this.areas[areaId];
		return;
	}

	var self = this;
	return Q.fcall(function(){
		return self.areaManager.saveArea(area, self.serverId);
	}).then(function(){
		delete self.areas[areaId];
		return self.areaManager.releaseArea(areaId, self.serverId);
	}).then(function(){
		logger.debug('area %s quit server %s', areaId, self.serverId);
	});
};

proto.isLoaded = function(areaId){
	return !!this.areas[areaId];
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
