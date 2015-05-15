'use strict';

var path = require('path');
var requireChildren = require('../../utils/require-children');

var DEFAULT_BASE_PATH = 'app/controllers';

var Controllers = function(app, opts){
    opts = opts || {};
    this._app = app;
    this._config = app.get('controllersConfig') || opts || {};
    this._config.basePath = this._config.basePath || DEFAULT_BASE_PATH;
};

var proto = Controllers.prototype;

proto.name = 'controllers';

proto.start = function(cb){
    var basePath = path.join(this._app.getBase(), this._config.basePath);
    this.loadControllers(basePath);
    cb();
};

proto.stop = function(force, cb){
    cb();
};

proto.loadControllers = function(basePath){
    var modules = requireChildren(module, basePath);

    var self = this;
    Object.keys(modules).forEach(function(name){
        var controller = modules[name](self._app);
        Object.defineProperty(self, name , {
            get : function(){
                return controller;
            }
        });
    });
};

module.exports = function(app, opts){
    var controllers = new Controllers(app, opts);
    app.set(controllers.name, controllers, true);
    return controllers;
};
