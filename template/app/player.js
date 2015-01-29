'use strict';

var util = require('util');
var Q = require('q');
var baseSchema = require('quick-pomelo').player.schema;

var schema = baseSchema.extend({
	name : String,
});

module.exports = {
	schema : schema
};
