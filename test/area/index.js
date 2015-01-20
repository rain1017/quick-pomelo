'use strict';

var should = require('should');
var logger = require('pomelo-logger').getLogger('test', __filename);
var Q = require('q');

var Area = require('../../app/components/area');

describe('areaServer test', function(){
	it('invoke', function(cb){

		var area = new Area({_id : 'area1'});
		area.invoke('method', 'opts');

		cb(null);
	});
});
