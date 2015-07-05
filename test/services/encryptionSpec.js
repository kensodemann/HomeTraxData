'use strict';

var expect = require('chai').expect;
var proxyquire = require('proxyquire');
var sinon = require('sinon');

describe('encryption', function() {
  var encryption;

  var mockBuffer;
  var mockCrypto;
  var mockHmac;

  beforeEach(function() {
    buildMockBuffer();
    buildMockHmac();
    buildMockCrypto();

    function buildMockBuffer() {
      mockBuffer = sinon.stub({
        toString: function() {
        }
      });
    }

    function buildMockHmac() {
      mockHmac = sinon.stub({
        update: function() {
        },
        digest: function() {
        }
      });
      mockHmac.update.returns(mockHmac);
    }

    function buildMockCrypto() {
      mockCrypto = sinon.stub({
        randomBytes: function() {
        },
        createHmac: function() {
        }
      });
      mockCrypto.randomBytes.returns(mockBuffer);
      mockCrypto.createHmac.returns(mockHmac);
    }
  });

  beforeEach(function() {
    encryption = proxyquire('../../src/services/encryption',{
      'crypto': mockCrypto
    });
  });

  describe('creating salt', function() {
    it('gets 128 random bytes', function() {
      encryption.createSalt();
      expect(mockCrypto.randomBytes.calledOnce).to.be.true;
      expect(mockCrypto.randomBytes.calledWith(128)).to.be.true;
    });

    it('converts to random bytes to a string', function() {
      encryption.createSalt();
      expect(mockBuffer.toString.calledOnce).to.be.true;
      expect(mockBuffer.toString.calledWith('base64')).to.be.true;
    });

    it('returns the salt', function(){
      mockBuffer.toString.returns('NaCl');
      var salt = encryption.createSalt();
      expect(salt).to.equal('NaCl');
    });
  });

  describe('creating hash', function(){
    it('create an sha1 hmac', function(){
      encryption.hash('NaCl', 'IAmPassword');
      expect(mockCrypto.createHmac.calledOnce).to.be.true;
      expect(mockCrypto.createHmac.calledWith('sha1', 'NaCl')).to.be.true;
    });

    it('updates the hmac with the password', function(){
      encryption.hash('NaCl', 'IAmPassword');
      expect(mockHmac.update.calledOnce).to.be.true;
      expect(mockHmac.update.calledWith('IAmPassword')).to.be.true;
    });

    it('returns a hex encoded digest of the hmac', function(){
      mockHmac.digest.returns('GrilledCheese');
      var ret = encryption.hash('NaCl', 'IAmPassword');
      expect(mockHmac.digest.calledOnce).to.be.true;
      expect(mockHmac.digest.calledWith('hex')).to.be.true;
      expect(ret).to.equal('GrilledCheese');
    });
  });
});
