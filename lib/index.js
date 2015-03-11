'use strict';

var quick = require('./utils/require-children')(module);
var pomeloLogger = require('pomelo-logger');
var memorydb = require('memorydb');

quick.configureLogger = function(){
	pomeloLogger.configure.apply(pomeloLogger, [].slice.call(arguments));
	memorydb.configureLogger.apply(memorydb, [].slice.call(arguments));
};

module.exports = quick;
