'use strict';

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var AreaSchema = new Schema({
	_id: {type: String, index: true},
	_server: {type: String, index: true, default: null},
	_type: {type: String, index: true, default: null},
	data : {type: Schema.Types.Mixed},
}, {collection : 'areas', versionKey : '__v'});

//AreaSchema.set('autoIndex', false);

module.exports = AreaSchema;
