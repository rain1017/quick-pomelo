'use strict';

var components = {};

Object.defineProperty(components, 'areaBackend', {
	get : function(){
		return require('./area-backend');
	}
});

Object.defineProperty(components, 'areaProxy', {
	get : function(){
		return require('./area-proxy');
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

Object.defineProperty(components, 'playerBackend', {
	get : function(){
		return require('./player-backend');
	}
});

Object.defineProperty(components, 'playerProxy', {
	get : function(){
		return require('./player-proxy');
	}
});

Object.defineProperty(components, 'defaultAreaAllocator', {
	get : function(){
		return require('./defaultarea-allocator');
	}
});

module.exports = components;
