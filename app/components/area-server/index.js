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

/*
 * @params opts.app - pomelo app instance
 *
 */
var AreaServer = function(opts){
	this.state = STATE.NONE;

	opts = opts || {};

	this.app = opts.app;
	this.areas = {};

	this.init();
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
	return this.app.get('areaManager').getAcquiredAreaIds().then(function(areaIds){
		var areaIdMap = {};
		areaIds.forEach(function(areaId){
			areaIdMap[areaId] = true;
		});

		var promises = [];

		areaIds.forEach(function(areaId){
			if(!self.areas[areaId]){
				// release area lock if area is acquired but not loaded
				promises.push(self.app.get('areaManager').releaseArea(areaId));
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
		return self.app.get('areaManager').acquireArea(areaId);
	}).then(function(){
		return Q.fcall(function(){
			return self.app.get('areaManager').loadArea(areaId);
		}).then(function(area){
			self.areas[areaId] = area;
			logger.debug('area %s joined server %s', areaId, self.app.getServerId());
		}).catch(function(e){
			self.app.get('areaManager').releaseArea(areaId).catch(function(e){
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
		throw new Error('area ' + areaId + ' not in server ' + this.app.getServerId());
	}

	if(force){
		delete this.areas[areaId];
		return;
	}

	var self = this;
	return Q.fcall(function(){
		return self.app.get('areaManager').saveArea(area);
	}).then(function(){
		delete self.areas[areaId];
		return self.app.get('areaManager').releaseArea(areaId);
	}).then(function(){
		logger.debug('area %s quit server %s', areaId, self.app.getServerId());
	});
};

proto.isLoaded = function(areaId){
	return !!this.areas[areaId];
};

proto.invokeArea = function(areaId, method, args){
	assert(this.state === STATE.RUNNING);

	var area = this.areas[areaId];
	if(!area){
		throw new Error('area ' + areaId + 'not loaded');
	}

	return area[method].apply(area, args);
};

module.exports = AreaServer;
