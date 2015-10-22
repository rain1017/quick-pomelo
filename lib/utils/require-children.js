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

// Modified from require-directory
// Require all modulues in one folder
// each direct child (may be folder or file) is a module.

var _ = require('underscore');
var fs = require('fs');
var join = require('path').join;
var resolve = require('path').resolve;
var dirname = require('path').dirname;
var defaultOptions = {
    extensions: ['js', 'json', 'coffee'],
    rename: function (name) {
        return name;
    },
    visit: function (obj) {
        return obj;
    }
};

module.exports = function(m, path, options) {
    var retval = {}, includeFile = null;

    // path is optional
    if (path && !options && !_.isString(path)) {
        options = path;
        path = null;
    }

    // default options
    options = _.defaults(options || {}, defaultOptions);

    // if no path was passed in, assume the equivelant of __dirname from caller
    // otherwise, resolve path relative to the equivalent of __dirname
    if (!path) {
        path = dirname(m.filename);
    } else {
        path = resolve(dirname(m.filename), path);
    }

    includeFile = function (path, filename) {
        // verify file has valid extension
        if (!new RegExp('\\.(' + options.extensions.join('|') + ')$', 'i').test(filename)) {
            return false;
        }

        // if options.include is a RegExp, evaluate it and make sure the path passes
        if (options.include && options.include instanceof RegExp && !options.include.test(path)) {
            return false;
        }

        // if options.include is a function, evaluate it and make sure the path passes
        if (options.include && _.isFunction(options.include) && !options.include(path, filename)) {
            return false;
        }

        // if options.exclude is a RegExp, evaluate it and make sure the path doesn't pass
        if (options.exclude && options.exclude instanceof RegExp && options.exclude.test(path)) {
            return false;
        }

        // if options.exclude is a function, evaluate it and make sure the path doesn't pass
        if (options.exclude && _.isFunction(options.exclude) && options.exclude(path, filename)) {
            return false;
        }

        return true;
    };

    // get the path of each file in specified directory, append to current tree node, recurse
    path = resolve(path);
    var obj = null;
    fs.readdirSync(path).forEach(function (filename) {
        var joined = join(path, filename), files, key, obj;
        if (fs.statSync(joined).isDirectory()) {
            try{
                obj = m.require(joined);
                retval[options.rename(filename, joined, filename)] = options.visit(obj, joined, filename) || obj;
            }
            catch(e){
            }
        }
        else {
            if (joined !== m.filename && includeFile(joined, filename)) {
                key = filename.substring(0, filename.lastIndexOf('.')); // hash node key shouldn't include file extension
                if(key !== 'index'){ // Ignore index
                    obj = m.require(joined);
                    retval[options.rename(key, joined, filename)] = options.visit(obj, joined, filename) || obj;
                }
            }
        }
    });
    return retval;
};
