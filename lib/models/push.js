'use strict';

module.exports = function(app){
    var opts = app.get('pushConfig') || {};
    var prefix = opts.prefix || '';

    var mdbgoose = app.memdb.goose;
    var Types = mdbgoose.Schema.Types;

    var ChannelSchema = new mdbgoose.Schema({
        _id : String,
        players : [String], // [playerId]
        connectors : [String], // [connectorId]
    }, {collection : prefix + 'channel'});

    var ChannelMsgSchema = new mdbgoose.Schema({
        _id : String, // channelId
        msgs : [Types.Mixed], // [msg, msg]
        seq : {type : Number, default : 0}, // next message seq
    }, {collection : prefix + 'channel_msg'});

    var PlayerChannelSchema = new mdbgoose.Schema({
        _id : String, // playerId
        channels : [String], // [channelId]
    }, {collection : prefix + 'player_channel'});

    mdbgoose.model('Channel', ChannelSchema);
    mdbgoose.model('ChannelMsg', ChannelMsgSchema);
    mdbgoose.model('PlayerChannel', PlayerChannelSchema);
};
