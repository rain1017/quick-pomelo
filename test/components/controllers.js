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

describe('controllers test', function(){

    it('load controllers', function(cb){
        var app = quick.mocks.app({serverId : 'area1', serverType : 'area'});
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
