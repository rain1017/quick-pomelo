'use strict';

var Q = require('q');

var Controller = function(app){
	this.app = app;
};

var proto = Controller.prototype;

module.exports = function(app){
	return new Controller(app);
};
