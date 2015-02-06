'use strict';

var util = require('util');
var BasePlayer = require('quick-pomelo').player;
var logger = require('pomelo-logger').getLogger('player', __filename);

var Player = function(){
	BasePlayer.apply(this, [].slice.call(arguments));
};

util.inherits(Player, BasePlayer);

Player.schema = BasePlayer.schema.extend({
	name : String,
});

var proto = Player.prototype;

// Called before being newly created
proto.onInit = function(opts){
	this.name = opts.name || 'No name';
};

// Called before being deleted
proto.onDestroy = function(){

};

// Called after loading (to memory)
proto.onStart = function(){

};

// Called before unloading (from memory)
proto.onStop = function(){

};

// Serialize states to mongo document
proto.onSerialize = function(doc){
	doc.name = this.name;
};

// Parse states from mongo document
proto.onDeserialize = function(doc){
	this.name = doc.name;
};

proto.test = function(){
	logger.debug('player.test %s', [].slice.apply(arguments));
};

module.exports = Player;
