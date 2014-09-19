'use strict';

describe('personForm Directive', function() {
  beforeEach(module('orderly.web'));

  describe('HTML', function() {
    it('contains expected input fields', function() {
      inject(function($compile, $rootScope) {
        var element = $compile('<person-form></person-form')($rootScope);
        
        expect(element.find('#firstName')).not.toBe(null);
      });
    });
  });
});
