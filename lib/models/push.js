// Copyright 2015 MemDB.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied. See the License for the specific language governing
// permissions and limitations under the License. See the AUTHORS file
// for names of contributors.

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
