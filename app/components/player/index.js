'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var logger = require('pomelo-logger').getLogger('player', __filename);

var playerSchema = new Schema({
	_id: {type: String, index: true},
	_areaId: {type: String, index: true},

	name: String,
});

//playerSchema.set('autoIndex', false);

var Player = mongoose.model('player', playerSchema);

module.exports = Player;
