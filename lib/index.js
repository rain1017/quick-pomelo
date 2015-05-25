'use strict';

var memdb = require('memdb');
var quick = require('./utils/require-children')(module);

quick.memdb = memdb;
quick.Promise = memdb.Promise;
quick.logger = memdb.logger;

module.exports = quick;
