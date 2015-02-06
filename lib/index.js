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

Object.defineProperty(quick, 'area', {
	get : function(){
		return require('./components/area');
	}
});

Object.defineProperty(quick, 'player', {
	get : function(){
		return require('./components/player');
	}
});

quick.configureLogger = function(){
	var pomeloLogger = require('pomelo-logger');
	pomeloLogger.configure.apply(pomeloLogger, [].slice.call(arguments));
};

module.exports = quick;
