'use strict';

var components = {};

Object.defineProperty(components, 'areaManager', {
	get : function(){
		return require('./area-manager');
	}
});

Object.defineProperty(components, 'areaServer', {
	get : function(){
		return require('./area-server');
	}
});

Object.defineProperty(components, 'autoScaling', {
	get : function(){
		return require('./autoscaling');
	}
});

Object.defineProperty(components, 'playerManager', {
	get : function(){
		return require('./player-manager');
	}
});

Object.defineProperty(components, 'defaultAreaAllocator', {
	get : function(){
		return require('./defaultarea-allocator');
	}
});

module.exports = components;
