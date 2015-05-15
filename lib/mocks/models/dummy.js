'use strict';

module.exports = function(app){
    var mdbgoose = app.memdb.goose;

    var DummySchema = new mdbgoose.Schema({
        _id : String,
        name : String,
        first : {type : String, indexIgnore : ['']},
        last : {type : String, indexIgnore : ['']},
        groupId : {type : String, index : true, indexIgnore : [-1]},
        uniqKey : {type : String, unique : true},
        uniqKey2 : {type : String, index : {unique : true}},
    });

    DummySchema.index({first : 1, last : 1}, {unique : true});

    mdbgoose.model('Dummy', DummySchema);
};
