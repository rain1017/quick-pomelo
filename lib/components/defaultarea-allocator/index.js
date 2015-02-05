'use strict';

var _ = require('lodash');
var Q = require('q');
var util = require('util');
var logger = require('pomelo-logger').getLogger('defaultarea-allocator', __filename);

var DEFAULT_AREA_CAPACITY = 100;
var DEFAULT_AREA_TIMEOUT = 180 * 1000;
var DEFAULT_AREA_FLUSH = 60 * 1000;
var DEFAULT_AREA_FREE_UPDATE = 2 * 1000;
var DEFAULT_RESIZE_INTERVAL = 2 * 1000;
var DEFAULT_MIN_FREE = 1000;
var DEFAULT_MAX_FREE = 2000;
var DEFAULT_JOIN_RETRIES = 3;

var STATE = {
				NONE : 0,
				STARTING : 1,
				IDLE : 2,
				RUNNING : 3,
				STOPING : 4,
				STOPED : 5,
			};

var DefaultAreaAllocator = function(app, opts){
	this.app = app;

	opts = opts || {};
	this.areaCapacity = opts.areaCapacity || DEFAULT_AREA_CAPACITY;
	this.areaTimeout = opts.areaTimeout || DEFAULT_AREA_TIMEOUT;
	this.areaFlush = opts.areaFlush || DEFAULT_AREA_FLUSH;

	//areaFreeUpdate should better < resizeInterval
	this.areaFreeUpdate = opts.areaFreeUpdate || DEFAULT_AREA_FREE_UPDATE;
	this.resizeIntervalValue = opts.resizeInterval || DEFAULT_RESIZE_INTERVAL;

	//minFree should better > resizeInterval * RPS (max request per second)
	this.minFree = opts.minFree || DEFAULT_MIN_FREE;
	this.maxFree = opts.maxFree || DEFAULT_MAX_FREE;
	this.joinRetries = opts.joinRetries || DEFAULT_JOIN_RETRIES;

	this.autoIncrement = opts.autoIncrement ? 1 : null;

	this.areas = []; //[{areaId : data}] sorted by area.free inc
	//Slots for quickly random pick a free area
	this.freeSlots = []; //[areaId, areaId ...]
	this.currentFree = 0; //current free slots

	this.state = STATE.NONE;
};

var proto = DefaultAreaAllocator.prototype;

proto.name = 'defaultAreaAllocator';

proto.start = function(cb){
	this.state = STATE.STARTING;
	this.resizeInterval = setInterval(this.resizeAreaPool.bind(this), this.resizeIntervalValue);
	cb(null);
};

proto.afterStart = function(cb){
	//process.nextTick(this.resizeAreaPool.bind(this));
	this.state = STATE.IDLE;
	cb(null);
};

proto.stop = function(force, cb){
	this.state = STATE.STOPING;
	clearInterval(this.resizeInterval);
	this.state = STATE.STOPPED;
	cb(null);
};

proto.joinDefaultArea = function(playerId, retries){
	retries = retries || 0;
	var areaId = this.getFreeAreaId();

	var self = this;
	return Q.fcall(function(){
		return self.app.playerProxy.joinArea(playerId, areaId);
	}).then(function(){
		logger.info('player %s joined default area %s', playerId, areaId);
		return areaId;
	},function(e){
		//Statistics may out of date, so join may fail, retry several times
		retries++;
		if(retries >= self.joinRetries){
			throw e;
		}
		return self.joinDefaultArea(playerId, retries);
	});
};

/**
 * Random pick a free slot from areas that has fewest free slots
 * the total candidate slots equals to this.minFree.
 * We try to put the player into the area that nearly full,
 * and meanwhile avoid joining failure due to non-realtime statistics.
 */
proto.getFreeAreaId = function(){
	var areaId = _.sample(this.freeSlots);

	if(!areaId){
		throw new Error('No free area available');
	}
	return areaId;
};

// refresh, allocate and recycle areas
// TODO: running timeout
proto.resizeAreaPool = function(){
	if(this.state !== STATE.IDLE){
		logger.warn('state is not idle');
		return;
	}

	logger.info('start resize area pool');
	this.state = STATE.RUNNING;
	var self = this;
	return Q.fcall(function(){
		return self.refreshStatistics();
	}).then(function(){
		return self.allocateArea();
	}).then(function(){
		return self.recycleArea();
	}).then(function(){
		return self.refreshStatistics();
	}).catch(function(e){
		logger.warn(e.stack);
	}).done(function(){
		self.state = STATE.IDLE;
		logger.info('finish resize area pool');
	});
};

proto.refreshStatistics = function(){
	var self = this;

	var Model = self.app.areaBackend.getAreaModel('default');
	return Q.fcall(function(cb){
		return Model.find({__t: 'default', free : {'$gt': 0}}, '_id free capacity').sort('free').exec(cb);
	}).then(function(areas){
		self.areas = areas;
		self.freeSlots = [];
		self.currentFree = 0;
		areas.forEach(function(area){
			// put the most nearly full areas into freeSlot array
			if(self.freeSlots.length < self.minFree){
				for(var i=0; i<area.free; i++){
					self.freeSlots.push(area._id);
				}
			}
			self.currentFree += area.free;
		//	logger.trace('Area statistics: {_id : %s, free : %s, capacity : %s}', area._id, area.free, area.capacity);
		});
	//	logger.trace('free slots: %s', self.freeSlots);
	});
};

// Allocate area when free slot exceed limit
proto.allocateArea = function(){
	var self = this;

	if(this.currentFree >= this.minFree){
		return;
	}

	var newCount = Math.floor((this.minFree - this.currentFree) / this.areaCapacity) + 1;

	return Q.allSettled(_.range(newCount).map(function(){
		return Q.fcall(function(){
			var opts = {_flush : self.areaFlush,
						capacity : self.areaCapacity,
						timeout : self.areaTimeout,
						freeUpdate : self.areaFreeUpdate};
			if(self.autoIncrement){
				opts._id = 'default' + self.autoIncrement++;
			}
			return self.app.areaBackend.createArea(opts, 'default');
		}).then(function(areaId){
			logger.debug('created default area %s', areaId);
		});
	}));
};

// Remove empty area when free slot exceed limit
proto.recycleArea = function(){
	var self = this;

	if(this.currentFree <= this.maxFree){
		return;
	}

	var emptyAreas = _.filter(this.areas, function(area){
		return area.free === area.capacity;
	});

	var removeCount = Math.floor((this.currentFree - this.maxFree) / this.areaCapacity) + 1;
	var areasToRemove = _.sample(emptyAreas, removeCount);

	return Q.allSettled(areasToRemove.map(function(area){
		var areaId = area._id;
		return Q.fcall(function(){
			return self.app.areaBackend.removeArea(areaId);
		}).then(function(){
			logger.debug('recycled empty area %s', areaId);
		}).catch(function(e){
			logger.warn(e.stack);
		});
	}));
};

module.exports = function(app, opts){
	var allocator = new DefaultAreaAllocator(app, opts);
	app.set(allocator.name, allocator, true);
	return allocator;
};
