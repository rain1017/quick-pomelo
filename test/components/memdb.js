// Copyright 2015 rain1017.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied. See the License for the specific language governing
// permissions and limitations under the License. See the AUTHORS file
// for names of contributors.

'use strict';

var env = require('../env');
var quick = require('../../lib');
var P = quick.Promise;
var logger = quick.logger.getLogger('test', __filename);

describe('memdb test', function(){
    beforeEach(env.initMemdbSync);
    afterEach(env.closeMemdbSync);

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
