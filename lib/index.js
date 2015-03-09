'use strict';

var quick = {};

var moduleNames = ['components', 'controllers', 'models', 'filters',
					'models', 'routes', 'servers', 'utils'];

moduleNames.forEach(function(name){
	Object.defineProperty(quick, name, {
		get : function(){
			return require('./' + name);
		}
	});
});

quick.configureLogger = function(){
	var pomeloLogger = require('pomelo-logger');
	pomeloLogger.configure.apply(pomeloLogger, [].slice.call(arguments));

	require('memorydb').configureLogger([].slice.call(arguments));
};

module.exports = quick;
