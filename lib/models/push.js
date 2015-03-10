'use strict';

module.exports = function(app){
	var opts = app.get('pushConfig') || {};
	var prefix = opts.prefix || '';

	var mdbgoose = app.memorydb.goose();

	var ChannelSchema = new mdbgoose.Schema({
		_id : String,
		players : {}, // {playerId : connectorId}
		msgs : [], // [msg, msg]
		seq : {type : Number, default : 0}, // next message seq
	}, {collection : prefix + 'channels'});

	var PlayerChannelSchema = new mdbgoose.Schema({
		_id : String, // playerId
		channels : {}, // {channelId : true}
	}, {collection : prefix + 'player2channel'});

	mdbgoose.model('Channel', ChannelSchema);
	mdbgoose.model('PlayerChannel', PlayerChannelSchema);
};
