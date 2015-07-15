'use strict';

module.exports = function(app){
    var mdbgoose = app.memdb.goose;

    var PlayerSchema = new mdbgoose.Schema({
        _id : {type : String},
        reqId : {type : Number, default : 0},
        areaId : {type : String},
        teamId : {type : String},
        connectorId : {type : String},
        name : {type : String},
    }, {collection : 'players'});

    mdbgoose.model('Player', PlayerSchema);
};
