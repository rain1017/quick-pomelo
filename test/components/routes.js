'use strict';

var env = require('../env');
var quick = require('../../lib');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);

describe('routes test', function(){
    it('load routes', function(cb){
        var app = quick.mocks.app({serverId : 'server1', serverType : 'area'});
        app.set('routesConfig', {basePath : 'lib/mocks/routes'});
        app.load(quick.components.routes);

        return P.try(function(){
            return P.promisify(app.start, app)();
        })
        .then(function(){
            (!!app._routes.dummy).should.eql(true);
        })
        .finally(function(){
            return P.promisify(app.stop, app)();
        })
        .nodeify(cb);
    });
});
