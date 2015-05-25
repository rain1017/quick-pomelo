'use strict';

var env = require('../env');
var quick = require('../../lib');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);

describe('controllers test', function(){

    it('load controllers', function(cb){
        var app = quick.mocks.app({serverId : 'server1', serverType : 'area'});
        app.set('controllersConfig', {basePath : 'lib/mocks/controllers'});
        app.load(quick.components.controllers);

        return P.try(function(){
            return P.promisify(app.start, app)();
        })
        .then(function(){
            (!!app.controllers.dummy).should.eql(true);
        })
        .finally(function(){
            return P.promisify(app.stop, app)();
        })
        .nodeify(cb);
    });
});
