'use strict';

module.exports = function(app){
	var mdbgoose = app.memdb.goose;

	var DummySchema = new mdbgoose.Schema({
		_id : String,
		name : String,
		groupId : {type : String, index : true},
	});

	mdbgoose.model('Dummy', DummySchema);
};
