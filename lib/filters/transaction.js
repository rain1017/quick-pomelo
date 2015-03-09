'use strict';

var Q = require('q');
var logger = require('pomelo-logger').getLogger('transaction', __filename);

var Filter = function(app) {
	this.app = app;
};

Filter.prototype.before = function(msg, session, next) {
	var autoConn = this.app.memorydb.autoConnect();

	var deferred = Q.defer();
	session.__transaction__ = deferred;

	var startTick = Date.now();

	autoConn.execute(deferred.promise)
	.then(function(ret){
		logger.info('%j => %j (%sms)', msg, ret, Date.now() - startTick);
	}, function(e){
		logger.warn('%j => %j (%sms)', msg, e, Date.now() - startTick);
	});

	next();
};

Filter.prototype.after = function(err, msg, session, resp, next) {
	var deferred = session.__transaction__;
	if(err){
		deferred.reject(err);
	}
	else{
		deferred.resolve(resp);
	}

	next(err);
};

module.exports = function(app) {
	return new Filter(app);
};
