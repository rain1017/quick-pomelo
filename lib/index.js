'use strict';

var quick = require('./utils/require-children')(module);

Object.defineProperty(quick, 'logger', {
	get : function(){
		return require('pomelo-logger');
	}
});

Object.defineProperty(quick, 'Promise', {
	get : function(){
		return require('bluebird');
	},
});

Object.defineProperty(quick, 'memdb', {
	get : function(){
		return require('memdb');
	},
});

module.exports = quick;
