'use strict';

var should = require('should');
var placeholder = require('../app/placeholder');

describe('placeholder test', function(){
	it('add', function(cb){
		placeholder.add(1, 1).should.equal(2);
		cb();
	});
});
