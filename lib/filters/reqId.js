'use strict';

// reqId is incremental by each request for specified player
// (except the requests without uid and the login request)
// client use reqId to judge whether status is in sync with server

// return reqId on user login by: app.reqIdFilter.getReqId(uid)
// remove reqId on user delete by: app.reqIdFilter.removeReqId(uid)

// this filter must be used globally:
// app.globalFilter(quick.filters.reqId(app));

var Filter = function(app) {
    this.app = app;
};

Filter.prototype.before = function(msg, session, next) {
    if(!session.uid){
        return next();
    }
    var goose = this.app.memdb.goose;
    goose.transaction(function(){
        return goose.autoconn.collection('__reqid__').update(session.uid, {$inc : {reqId : 1}}, {upsert : true});
    }, this.app.getServerId())
    .nodeify(next);
};

Filter.prototype.after = function(err, msg, session, resp, next) {
    next(err);
};

Filter.prototype.getReqId = function(uid){
    return this.app.memdb.goose.autoconn.collection('__reqid__').find(uid)
    .then(function(doc){
        return doc ? doc.reqId : 0;
    });
};

Filter.prototype.removeReqId = function(uid){
    return this.app.memdb.goose.autoconn.collection('__reqid__').remove(uid);
};

module.exports = function(app) {
    var filter = new Filter(app);
    app.set('reqIdFilter', filter, true);
    return filter;
};
