'use strict';

var util = require('util');
var BasePlayer = require('../../lib').player;
var logger = require('pomelo-logger').getLogger('test', __filename);

var Player = function(){
	BasePlayer.apply(this, [].slice.call(arguments));
};

util.inherits(Player, BasePlayer);

Player.schema = BasePlayer.schema.extend({
	name : String,
});

var proto = Player.prototype;

proto.onInit = function(opts){
	this.name = opts.name || 'No name';
};

proto.onDestroy = function(){

};

proto.onStart = function(){

};

proto.onStop = function(){

};

proto.onSerialize = function(doc){
	doc.name = this.name;
};

proto.onDeserialize = function(doc){
	this.name = doc.name;
};

proto.set = function(attr, value){
	this[attr] = value;
};

proto.test = function(){
	logger.debug('player.test %s', [].slice.apply(arguments));
};

module.exports = Player;
