'use strict';

var env = require('../env');
var quick = require('../../lib');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);

describe('timer test', function(){
    beforeEach(env.initMemdbSync);
    afterEach(env.closeMemdbSync);

    it('timeout/interval', function(cb){
        var app = quick.mocks.app({serverId : 'area1', serverType : 'area'});

        var config = JSON.parse(JSON.stringify(env.memdbConfig)); //clone
        config.modelsPath = 'lib/mocks/models';

        app.set('memdbConfig', config);
        app.load(quick.components.memdb);
        app.load(quick.components.timer);

        return P.try(function(){
            return P.promisify(app.start, app)();
        })
        .then(function(){
            var deferred = P.defer();

            var Dummy = app.models.Dummy;

            app.timer.setInterval(function(){
                return P.try(function(){
                    return Dummy.findByIdAsync(1);
                })
                .then(function(doc){
                    if(!doc){
                        doc = new Dummy({_id : 1, count : 0});
                    }
                    doc.count++;
                    return doc.saveAsync();
                });
            }, 300, 'interval1');

            app.timer.setTimeout(function(){
                return P.try(function(){
                    return Dummy.findByIdAsync(1);
                })
                .then(function(doc){
                    doc.count.should.eql(2);
                    return doc.removeAsync();
                })
                .then(function(){
                    app.timer.clear('interval1');
                    deferred.resolve();
                });
            }, 700, 'timeout1');

            var timeout = app.timer.setTimeout(function(){
                throw new Error('should not called');
            }, 200);
            clearTimeout(timeout);

            return deferred.promise;
        })
        .then(function(){
            return P.promisify(app.stop, app)();
        })
        .nodeify(cb);
    });

});
