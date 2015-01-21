'use strict';

var util = require('util');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('area-server', __filename);
var assert = require('assert');
var Area = require('../area');

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
				promises.push(self.unloadArea(areaId, true));
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
		return self.loadArea(areaId).catch(function(e){
			self.areaManager.releaseArea(areaId, self.serverId).catch(function(e){
				logger.warn(e);
			});
			throw e;
		});
	});
};

proto.quit = function(areaId){
	assert(this.state === STATE.RUNNING);
	var self = this;

	return Q.fcall(function(){
		return self.unloadArea(areaId);
	}).then(function(){
		return self.areaManager.releaseArea(areaId, self.serverId);
	});
};

proto.loadArea = function(areaId){
	assert(this.state === STATE.RUNNING);

	var self = this;
	return Q.ninvoke(Area, 'findById', areaId)
	.then(function(area){
		if(!area){
			throw new Error('area ' + areaId + ' not exist');
		}
		self.areas[areaId] = area;
		logger.debug('loaded area %s', areaId);
	});
};

/*
 *
 * @param force - force unload without save
 */
proto.unloadArea = function(areaId, force){
	assert(this.state === STATE.RUNNING);
	var self = this;

	return Q.fcall(function(){
		if(!force){
			return self.saveArea(areaId);
		}
	}).then(function(){
		delete self.areas[areaId];
		logger.debug('unloaded area %s', areaId);
	});
};

proto.isLoaded = function(areaId){
	return !!this.areas[areaId];
};

proto.saveArea = function(areaId){
	assert(this.state === STATE.RUNNING);
	var self = this;

	return Q.fcall(function(){
		return self.areaManager.ensureAcquired(areaId, self.serverId);
	}).then(function(){
		var area = self.areas[areaId];
		if(!area){
			throw new Error('area ' + areaId + ' not loaded');
		}

		//Version control, incase the area is an out of date version.
		//(http://aaronheckmann.tumblr.com/post/48943525537/mongoose-v3-part-1-versioning)
		area.increment();

		return Q.ninvoke(area, 'save').then(function(){
			logger.debug('saved area %s', areaId);
		});
	});
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
