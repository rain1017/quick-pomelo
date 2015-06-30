'use strict';

var env = require('../env');
var quick = require('../../lib');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);

describe('memdb test', function(){
    beforeEach(function(cb){
        env.initMemdb().nodeify(cb);
    });
    afterEach(function(cb){
        env.closeMemdb().nodeify(cb);
    });

    it('load memdb', function(cb){
        var app = quick.mocks.app({serverId : 'area1', serverType : 'area'});

        var config = JSON.parse(JSON.stringify(env.memdbConfig)); //clone
        config.modelsPath = 'lib/mocks/models';

        app.set('memdbConfig', config);
        app.load(quick.components.memdb);

        return P.try(function(){
            return P.promisify(app.start, app)();
        })
        .then(function(){
            return app.memdb.goose.autoconn;
        })
        .then(function(ret){
            var autoconn = ret;
            return autoconn.transaction(function(){
                return P.try(function(){
                    var dummy = new app.models.Dummy({_id : '1', name : 'dummy'});
                    return dummy.saveAsync();
                })
                .then(function(){
                    return app.models.Dummy.findAsync({_id : '1'});
                })
                .then(function(dummys){
                    dummys.length.should.eql(1);
                    dummys[0].name.should.eql('dummy');

                    return dummys[0].removeAsync();
                });
            });
        })
        .then(function(){
            return P.promisify(app.stop, app)();
        })
        .nodeify(cb);
    });
});
