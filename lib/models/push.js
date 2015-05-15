'use strict';

module.exports = function(app){
    var opts = app.get('pushConfig') || {};
    var prefix = opts.prefix || '';

    var mdbgoose = app.memdb.goose;
    var Types = mdbgoose.Schema.Types;

    var ChannelSchema = new mdbgoose.Schema({
        _id : String,
        players : {type : Types.Mixed, default : {}},// {playerId : connectorId}

        msgs : [Types.Mixed], // [msg, msg]

        seq : {type : Number, default : 0}, // next message seq
    }, {collection : prefix + 'channels'});

    var PlayerChannelSchema = new mdbgoose.Schema({
        _id : String, // playerId
        channels : {type : Types.Mixed, default : {}}, // {channelId : true}
    }, {collection : prefix + 'player2channel'});

    mdbgoose.model('Channel', ChannelSchema);
    mdbgoose.model('PlayerChannel', PlayerChannelSchema);
};
