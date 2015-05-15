'use strict';

module.exports = function(app){
    var mdbgoose = app.memdb.goose;

    var TeamSchema = new mdbgoose.Schema({
        _id : {type : String},
        name : {type : String},
    }, {collection : 'teams'});

    mdbgoose.model('Team', TeamSchema);
};
