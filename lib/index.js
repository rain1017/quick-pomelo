'use strict';

var quick = require('./utils/require-children')(module);

Object.defineProperty(quick, 'logger', {
	get : function(){
		return require('pomelo-logger');
	}
});

Object.defineProperty(quick, 'q', {
	get : function(){
		return require('q');
	},
});

Object.defineProperty(quick, 'memorydb', {
	get : function(){
		return require('memorydb');
	},
});

module.exports = quick;
