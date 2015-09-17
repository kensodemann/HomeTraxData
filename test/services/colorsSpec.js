'use strict';

var expect = require('chai').expect;
var colors = require('../../src/services/colors');

describe('colors', function() {
  describe('user pallets', function() {
    it('contains six pallets', function() {
      expect(colors.userPallets.length).to.equal(6);
    });

    it('has four items per pallet', function() {
      colors.userPallets.forEach(function(pallet) {
        expect(pallet.length).to.equal(4);
      });
    });

    it('consists of colors', function() {
      var colorRE = /^#[0-9a-fA-F]{6}$/;
      colors.userPallets.forEach(function(pallet) {
        pallet.forEach(function(item) {
          expect(colorRE.test(item)).to.be.true;
        });
      });
    });
  });

  describe('getting a pallet', function() {
    it('returns the Nth pallet if n is less than the number of palets', function(){
      var pallet = colors.getPallet(3);
      expect(pallet).to.deep.equal(colors.userPallets[3]);
    });

    it('returns the 0th pallet if n is the number of pallets', function(){
      var pallet = colors.getPallet(6);
      expect(pallet).to.deep.equal(colors.userPallets[0]);
    });

    it('returns the appropriate pallet if n is greater than the number of pallets', function(){
      var pallet = colors.getPallet(10);
      expect(pallet).to.deep.equal(colors.userPallets[4]);
    });
  });
});
