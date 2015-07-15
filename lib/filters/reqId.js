'use strict';

// reqId is incremental by each request for specified player
// (except the requests without uid and the login request)
// client use reqId to judge whether status is in sync with server

// to make it real work, you have to:
// manually save reqId on logout and restore reqId on login

// this filter must be used globally:
// app.globalFilter(quick.filters.reqId(app));

var Filter = function(app) {
    this.app = app;
};

Filter.prototype.before = function(msg, session, next) {
    var reqId = session.get('reqId');
    if(typeof(reqId) === 'number'){
        session.set('reqId', ++reqId);
    }
    next();
};

Filter.prototype.after = function(err, msg, session, resp, next) {
    return next(err);
};

module.exports = function(app) {
    return new Filter(app);
};
