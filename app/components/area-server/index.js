'use strict';

var util = require('util');
var usage = require('usage');
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

var DEFAULT_REPORT_INTERVAL = 5 * 1000;

/*
 * @params opts.app - pomelo app instance
 * areaServerConfig - {reportInterval}
 */
var AreaServer = function(opts){
	this.state = STATE.NONE;

	this.app = opts.app;
	var config = this.app.get('areaServerConfig') || {};

	this.reportIntervalValue = config.reportInterval || DEFAULT_REPORT_INTERVAL;

	this.areas = {};
};

var proto = AreaServer.prototype;

proto.init = function(){
	assert(this.state === STATE.NONE);
	this.state = STATE.INITING;

	this.reportInterval = setInterval(this.reportServerStatus.bind(this), this.reportIntervalValue);

	this.state = STATE.RUNNING;
};

proto.close = function(){
	assert(this.state === STATE.RUNNING);
	this.state = STATE.CLOSING;

	clearInterval(this.reportInterval);

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
				promises.push(self.app.get('areaManager').releaseArea(areaId).catch(function(e){
					logger.warn(e.stack);
				}));
			}
		});

		Object.keys(self.areas).forEach(function(areaId){
			if(!areaIdMap[areaId]){
				// force unload area if area is loaded but not acquired
				promises.push(self.quit(areaId, true).catch(function(e){
					logger.warn(e.stack);
				}));
			}
		});

		return Q.allSettled(promises);
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
				logger.warn(e.stack);
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

	var self = this;
	if(force){
		return Q.fcall(function(){
			delete self.areas[areaId];
		});
	}

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

/*
 * report server status to autoscaling
 */
proto.reportServerStatus = function(){
	var app = this.app;
	var loadAve = this.getLoadAverage();
	return Q.nfcall(function(cb){
		app.rpc.autoscaling.reportRemote.reportServerStatus(null, app.getServerId(), loadAve, cb);
	});
};

proto.getLoadAverage = function(){
	return Q.nfcall(function(cb){
		return usage.lookup(process.pid, {keepHistory : true}, cb);
	}).then(function(status){
		var cpuPercent = status.cpu / 100;
		//v8 memory limit is 1GB
		var memoryPercent = status.memory / (1024 * 1024 * 1024);

		//max loadAve = 1 (either cpu or memory is full)
		var loadAve = 1 - (1 - cpuPercent) * (1 - memoryPercent);
		if(loadAve > 1){
			loadAve = 1;
		}
		if(loadAve < 0){
			loadAve = 0;
		}
		return loadAve;
	});
};

module.exports = AreaServer;
