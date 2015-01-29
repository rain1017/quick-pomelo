'use strict';

var util = require('util');
var Q = require('q');
var logger = require('pomelo-logger').getLogger('test', __filename);
var baseSchema = require('../lib').player.schema;

var schema = baseSchema.extend({
	name : String,
});

module.exports = {
	schema : schema
};
