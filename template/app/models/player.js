'use strict';

module.exports = function(app){
	var mdbgoose = app.memorydb.goose;

	var PlayerSchema = new mdbgoose.Schema({
		_id : {type : String},
		areaId : {type : String, index : true},
		teamId : {type : String, index : true},
		connectorId : {type : String},
		name : {type : String},
	}, {collection : 'players'});

	mdbgoose.model('Player', PlayerSchema);
};
