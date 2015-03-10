'use strict';

var quick = require('./utils/require-children')(module);

quick.configureLogger = function(){
	var pomeloLogger = require('pomelo-logger');
	pomeloLogger.configure.apply(pomeloLogger, [].slice.call(arguments));

	require('memorydb').configureLogger([].slice.call(arguments));
};

module.exports = quick;
