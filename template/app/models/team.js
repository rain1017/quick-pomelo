'use strict';

module.exports = function(app){
	var mdbgoose = app.memorydb.goose();

	var TeamSchema = new Schema({
		_id : {type : String},
		name : {type : String},
	}, {collection : 'teams'});

	mdbgoose.Model('Team', TeamSchema);
};
