'use strict';

module.exports = function(app){
	var mdbgoose = app.memorydb.goose();

	var AreaSchema = new mdbgoose.Schema({
		_id : {type : String},
		name : {type : String},
	}, {collection : 'areas'});

	mdbgoose.Model('Area', AreaSchema);
};

