'use strict';

var util = require('util');
var AsyncLock = require('async-lock');
var usage = require('usage');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('area-server', __filename);

var STATE = {
				NONE : 0,
				STARTING : 1,
				RUNNING : 2,
				BEFORESTOP : 3,
				STOPING : 4,
				STOPED : 5,
			};

var DEFAULT_REPORT_INTERVAL = 3 * 1000;
var DEFAULT_SYNC_INTERVAL = 30 * 1000;

/*
 * @params opts.app - pomelo app instance
 * areaServerConfig - {reportInterval}
 */
var AreaServer = function(app, opts){
	this.state = STATE.NONE;

	this.app = app;
	opts = opts || {};
	this.reportIntervalValue = opts.reportInterval || DEFAULT_REPORT_INTERVAL;
	this.syncIntervalValue = opts.syncInterval || DEFAULT_SYNC_INTERVAL;

	this.areas = {};
	this.areaLock = new AsyncLock();
};

var proto = AreaServer.prototype;

proto.name = 'areaServer';

proto.start = function(cb){
	this.ensureState(STATE.NONE);

	this.state = STATE.STARTING;

	this.reportInterval = setInterval(this.reportServerStatus.bind(this), this.reportIntervalValue);
	this.syncInterval = setInterval(this.syncAcquiredAreas.bind(this), this.syncIntervalValue);

	this.state = STATE.RUNNING;

	logger.info('areaServer started');
	cb();
};

proto.afterStart = function(cb){
	this.ensureState(STATE.RUNNING);
	// Sync immediately after start
	this.syncAcquiredAreas();
	cb();
};

// quit all areas
proto.beforeStop = function(cb){
	this.ensureState(STATE.RUNNING);
	this.state = STATE.BEFORESTOP;

	logger.info('areaServer beforeStop...');

	clearInterval(this.reportInterval);

	var self = this;
	Q.fcall(function(){
		return Q.allSettled(Object.keys(self.areas).map(function(areaId){
			return Q.fcall(function(){
				return self.quit(areaId);
			}).catch(function(e){
				logger.error(e.stack);
			});
		}));
	}).then(function(){
		cb();
	}, cb);
};

proto.stop = function(force, cb){
	this.ensureState(STATE.BEFORESTOP);

	this.state = STATE.STOPING;

	clearInterval(this.syncInterval);

	this.state = STATE.STOPED;
	logger.info('areaServer stoped');
	cb();
};

/*
 * Sync areas assignment from manager
 * Fix data inconsistency
 * Called when connect to cluster
 */
proto.syncAcquiredAreas = function(){
	this.ensureState([STATE.RUNNING, STATE.BEFORESTOP]);

	logger.info('start sync acquired areas');
	var self = this;
	return this.app.areaBackend.getAcquiredAreaIds().then(function(areaIds){
		var areaIdMap = {};
		areaIds.forEach(function(areaId){
			areaIdMap[areaId] = true;
		});

		var promises = [];

		areaIds.forEach(function(areaId){
			if(!self.areas[areaId]){
				// release area lock if area is acquired but not loaded
				promises.push(self.app.areaBackend.releaseArea(areaId).catch(function(e){
					logger.warn(e.stack);
				}));
			}
		});

		Object.keys(self.areas).forEach(function(areaId){
			if(!areaIdMap[areaId]){
				// force unload area if area is loaded but not acquired
				promises.push(self.quit(areaId, {force : true}).catch(function(e){
					logger.warn(e.stack);
				}));
			}
		});

		return Q.allSettled(promises).then(function(){
			logger.info('finish sync acquired areas');
		});
	});
};

//TODO: Lock area
proto.join = function(areaId){
	this.ensureState(STATE.RUNNING);
	var self = this;

	var area = null;
	return Q.fcall(function(){
		return self.app.areaBackend.acquireArea(areaId);
	}).then(function(){
		return Q.fcall(function(){
			return Q.fcall(function(){
				return self.app.areaBackend.loadArea(areaId);
			}).then(function(ret){
				area = ret;
				self.areas[areaId] = area;
			});
		}).then(function(){
			return Q.fcall(function(){
				return area.start();
			}).catch(function(e){
				// can't role back here
				logger.error(e.stack);
			}).then(function(){
				logger.debug('area %s joined server %s', areaId, self.app.getServerId());
			});
		}, function(e){
			if(self.areas.hasOwnProperty(areaId)){
				delete self.areas[areaId];
			}
			return self.app.areaBackend.releaseArea(areaId).catch(function(e){
				logger.warn(e.stack);
			}).then(function(){
				//rethrow error
				throw e;
			});
		});
	});
};

/*
 *
 * @param opts.force - force unload without save
 * @param opts.remove - quit and remove (call destroy instead of save)
 */
proto.quit = function(areaId, opts){
	this.ensureState([STATE.RUNNING, STATE.BEFORESTOP]);

	opts = opts || {};
	var area = this.areas[areaId];
	if(!area){
		logger.warn('area %s not in server %s', areaId, this.app.getServerId());
		return;
	}

	var self = this;
	if(opts.force){
		return Q.fcall(function(){
			delete self.areas[areaId];
			logger.warn('area %s quit server %s by force', areaId, self.app.getServerId());
		});
	}

	return Q.fcall(function(){
		return area.stop();
	}).then(function(){
		if(!opts.remove){
			return self.app.areaBackend.saveArea(area);
		}
		else{
			return area.destroy();
		}
	}).then(function(){
		return self.app.areaBackend.releaseArea(areaId);
	}).then(function(){
		delete self.areas[areaId];
		logger.debug('area %s quit server %s', areaId, self.app.getServerId());
	});
};

proto.isLoaded = function(areaId){
	return !!this.areas[areaId];
};

proto.invokeArea = function(areaId, method, args){
	this.ensureState([STATE.RUNNING, STATE.BEFORESTOP]);

	var area = this.areas[areaId];
	if(!area){
		throw new Error('area ' + areaId + ' not joined');
	}

	if(typeof(area[method]) !== 'function'){
		throw new Error('area has no method %s', method);
	}

	//Methods in the same area will execute in serial
	return Q.ninvoke(this.areaLock, 'acquire', areaId, function(cb){
		Q.fcall(function(){
			logger.info('Invoking area[%s].%s(%s)', areaId, method, args);
			return area[method].apply(area, args);
		}).then(function(ret){
			logger.info('Invoked area[%s].%s(%s) => %s', areaId, method, args, ret);
			cb(null, ret);
		}, function(e){
			logger.warn('Invoked area[%s].%s(%s) => %s', areaId, method, args, e.message);
			cb(e);
		});
	});
};

/*
 * report server status to autoscaling
 */
proto.reportServerStatus = function(){
	this.ensureState([STATE.RUNNING, STATE.BEFORESTOP]);

	var app = this.app;
	var self = this;
	return Q.fcall(function(){
		return self.getLoadAverage();
	}).then(function(load){
		return Q.ninvoke(app.rpc.autoscaling.quickRemote, 'reportServerStatus', null, app.getServerId(), load);
	}).catch(function(e){
		logger.error(e.stack);
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

proto.ensureState = function(states){
	if(!(states instanceof Array)){
		states = [states];
	}
	for(var i in states){
		if(states[i] === this.state){
			return;
		}
	}
	throw new Error(util.format('State %s is not correct, expected %s', this.state, states));
};

module.exports = function(app, opts){
	var areaServer = new AreaServer(app, opts);
	app.set(areaServer.name, areaServer, true);
	return areaServer;
};
