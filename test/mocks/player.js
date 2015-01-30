'use strict';

var baseSchema = require('../../lib').player.schema;

var schema = baseSchema.extend({
	name : String,
});

module.exports = {
	schema : schema
};
