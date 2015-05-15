'user strict';

var blanket = require('blanket');
var path = require('path');
var srcDir = path.join(__dirname, '../app');

blanket({
    pattern: srcDir
});
