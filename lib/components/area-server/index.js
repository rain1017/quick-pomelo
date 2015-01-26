'use strict';

var util = require('util');
var usage = require('usage');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('area-server', __filename);
var assert = require('assert');

var STATE = {
				NONE : 0,
				STARTING : 1,
				RUNNING : 2,
				STOPING : 3,
				STOPED : 4,
			};

var DEFAULT_REPORT_INTERVAL = 5 * 1000;

/*
 * @params opts.app - pomelo app instance
 * areaServerConfig - {reportInterval}
 */
var AreaServer = function(app, opts){
	this.state = STATE.NONE;

	this.app = app;
	opts = opts || {};
	this.reportIntervalValue = opts.reportInterval || DEFAULT_REPORT_INTERVAL;

	this.areas = {};
};

var proto = AreaServer.prototype;

proto.name = 'areaServer';

proto.start = function(cb){
	assert(this.state === STATE.NONE);
	this.state = STATE.STARTING;

	this.reportInterval = setInterval(this.reportServerStatus.bind(this), this.reportIntervalValue);

	this.state = STATE.RUNNING;

	logger.info('areaServer started');
	cb();
};

proto.stop = function(force, cb){
	assert(this.state === STATE.RUNNING);
	this.state = STATE.STOPING;

	clearInterval(this.reportInterval);

	this.state = STATE.STOPED;

	logger.info('areaServer stoped');
	cb();
};

/*
 * Sync areas assignment from manager
 * Called when connect to cluster
 */
proto.syncAcquiredAreas = function(){
	assert(this.state === STATE.RUNNING);

	var self = this;
	return this.app.areaManager.getAcquiredAreaIds().then(function(areaIds){
		var areaIdMap = {};
		areaIds.forEach(function(areaId){
			areaIdMap[areaId] = true;
		});

		var promises = [];

		areaIds.forEach(function(areaId){
			if(!self.areas[areaId]){
				// release area lock if area is acquired but not loaded
				promises.push(self.app.areaManager.releaseArea(areaId).catch(function(e){
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
		return self.app.areaManager.acquireArea(areaId);
	}).then(function(){
		return Q.fcall(function(){
			return self.app.areaManager.loadArea(areaId);
		}).then(function(area){
			self.areas[areaId] = area;
			logger.debug('area %s joined server %s', areaId, self.app.getServerId());
		}).catch(function(e){
			self.app.areaManager.releaseArea(areaId).catch(function(e){
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
		return self.app.areaManager.saveArea(area);
	}).then(function(){
		delete self.areas[areaId];
		return self.app.areaManager.releaseArea(areaId);
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

module.exports = function(app, opts){
	var areaServer = new AreaServer(app, opts);
	app.set(areaServer.name, areaServer, true);
	return areaServer;
};
