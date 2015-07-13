'use strict';

var env = require('../env');
var quick = require('../../lib');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);

describe.only('push test', function(){
    beforeEach(env.initMemdbSync);
    afterEach(env.closeMemdbSync);

    it('push test', function(cb){
        var app = quick.mocks.app({serverId : 'area1', serverType : 'area'});

        app.set('memdbConfig', env.memdbConfig);

        app.set('controllersConfig', {basePath : 'lib/controllers'});
        app.set('pushConfig', {maxMsgCount : 2});

        app.load(quick.components.memdb);
        app.load(quick.components.controllers);

        return P.try(function(){
            return P.promisify(app.start, app)();
        })
        .then(function(){
            var autoconn = app.memdb.goose.autoconn;
            var push = app.controllers.push;

            return autoconn.transaction(function(){
                return P.try(function(){
                    //p1 join c1 (connector s1)
                    return push.joinAsync('c1', 'p1', 's1');
                })
                .then(function(){
                    //send persistent msg to p1
                    return push.pushAsync('c1', null, 'chat', 'hello1', true);
                })
                .then(function(){
                    //p2 (offline) join c1
                    return push.joinAsync('c1', 'p2', '');
                })
                .then(function(){
                    //send persistent msg to p1 & p2 (p2 will not receive notify but can read msg history)
                    return push.pushAsync('c1', null, 'chat', 'hello2', true);
                })
                .then(function(){
                    //send msg to p1 (p2 will not see this message)
                    return push.pushAsync('c1', null, 'notify', 'context', false);
                })
                .then(function(){
                    //p2 is online (connector s2)
                    return push.connectAsync('p2', 's2');
                })
                .then(function(){
                    //send msg to p1 & p2 (both will receive notify)
                    return push.pushAsync('c1', null, 'notify', 'context', false);
                })
                .then(function(){
                    //send msg to p2 only
                    return push.pushAsync('c1', ['p2'], 'notify', 'content', false);
                })
                .then(function(){
                    //get message history
                    return push.getMsgsAsync('c1', 0)
                    .then(function(ret){
                        ret.length.should.eql(2);
                        ret[0].should.eql({
                            route : 'chat',
                            msg : 'hello1',
                            seq : 0,
                        });
                        ret[1].should.eql({
                            route : 'chat',
                            msg : 'hello2',
                            seq : 1,
                        });
                    });
                })
                .then(function(){
                    //send 3rd persistent message, will exceed history limit, history will be cut down
                    return push.pushAsync('c1', null, 'chat', 'hello3', true);
                })
                .then(function(){
                    //get history
                    return push.getMsgsAsync('c1', 0, 3)
                    .then(function(ret){
                        //can get only latest 2 messages
                        ret.length.should.eql(2);
                        ret[0].should.eql({
                            route : 'chat',
                            msg : 'hello2',
                            seq : 1,
                        });
                        ret[1].should.eql({
                            route : 'chat',
                            msg : 'hello3',
                            seq : 2,
                        });
                    });
                })
                .then(function(){
                    return push.disconnectAsync('p1');
                })
                .then(function(){
                    return push.quitAsync('c1', 'p1');
                })
                .then(function(){
                    return push.quitAsync('c1', 'p2');
                });
            });
        })
        .then(function(){
            app.event.emit('transactionSuccess');
        }, function(err){
            app.event.emit('transactionFail');
            throw err;
        })
        .then(function(){
            return P.promisify(app.stop, app)();
        })
        .nodeify(cb);
    });
});
