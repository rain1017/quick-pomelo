'use strict';

var P = require('bluebird');
var memdb = require('memdb');
var logger = require('pomelo-logger');
memdb.injectLogger(logger);

var quick = require('./utils/require-children')(module);

quick.Promise = P;
quick.logger = logger;
quick.memdb = memdb;

module.exports = quick;
