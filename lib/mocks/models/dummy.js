'use strict';

module.exports = function(app){
    var mdbgoose = app.memdb.goose;

    var DummySchema = new mdbgoose.Schema({
        _id : String,
        name : String,
    });
    mdbgoose.model('Dummy', DummySchema);
};
