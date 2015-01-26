'use strict';

var quick = {};

Object.defineProperty(quick, 'components', {
	get : function(){
		return require('./components');
	}
});

Object.defineProperty(quick, 'servers', {
	get : function(){
		return require('./servers');
	}
});

Object.defineProperty(quick, 'routes', {
	get : function(){
		return require('./routes');
	}
});

module.exports = quick;
