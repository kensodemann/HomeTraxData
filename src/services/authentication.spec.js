'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var encryption = require('./encryption');

describe('authentication', function() {
  var authentication;
  var mockConfig;
  var mockJWT;

  beforeEach(function() {
    mockJWT = sinon.stub({
      sign: function() {
      },

      verify: function() {
      }
    });
    mockConfig = {
      jwtCertificate: 'IAmAFakeCertificate'
    };
  });

  beforeEach(function() {
    authentication = proxyquire('./authentication', {
      'jsonwebtoken': mockJWT,
      '../config/secret': mockConfig
    });
  });

  describe('refreshing a login token', function() {
    var req;
    var res;
    beforeEach(function() {
      req = {
        headers: {
          authorization: 'Bearer IAmAToken'
        }
      };

      res = sinon.stub({
        send: function() {
        }
      });
    });

    it('decrypts the old token', function() {
      mockJWT.verify.withArgs('IAmAToken', 'IAmAFakeCertificate').returns({id: 666, name: 'John Scott'});
      authentication.refreshToken(req, res);
      expect(mockJWT.verify.calledOnce).to.be.true;
      expect(mockJWT.verify.calledWith('IAmAToken', 'IAmAFakeCertificate')).to.be.true;
    });

    describe('if the previous token is valid', function() {
      beforeEach(function() {
        mockJWT.verify.withArgs('IAmAToken', 'IAmAFakeCertificate').returns({id: 666, name: 'John Scott'});
      });

      it('generates a new token for the user', function() {
        authentication.refreshToken(req, res);
        expect(mockJWT.sign.calledOnce).to.be.true;
        expect(mockJWT.sign.calledWith({id: 666, name: 'John Scott'}, 'IAmAFakeCertificate')).to.be.true;
      });

      it('strips the iat and exp if they exist', function() {
        mockJWT.verify.withArgs('IAmAToken', 'IAmAFakeCertificate').returns({
          id: 666,
          name: 'John Scott',
          iat: 1234,
          exp: 2345
        });
        authentication.refreshToken(req, res);
        expect(mockJWT.sign.calledOnce).to.be.true;
        expect(mockJWT.sign.calledWith({id: 666, name: 'John Scott'}, 'IAmAFakeCertificate')).to.be.true;
      });

      it('sends the new token and a true status', function() {
        mockJWT.sign.withArgs({id: 666, name: 'John Scott'}, 'IAmAFakeCertificate').returns('IAmNewToken');
        authentication.refreshToken(req, res);
        expect(res.send.calledOnce).to.be.true;
        expect(res.send.calledWith({success: true, token: 'IAmNewToken'})).to.be.true;
      });
    });

    describe('if the previous token is invalid', function() {
      beforeEach(function() {
        mockJWT.verify.throws('InvalidToken');
        authentication.refreshToken(req, res);
      });

      it('does not generate a new token', function() {
        expect(mockJWT.sign.called).to.be.false;
      });

      it('sends success false', function() {
        expect(res.send.calledOnce).to.be.true;
        expect(res.send.calledWith({success: false})).to.be.true;
      });
    });
  });

  describe('passwordIsValid', function() {
    var user = {
      salt: 'NaCl',
      hashedPassword: encryption.hash('NaCl', 'enteredPassword')
    };

    it('returns true if password correct', function() {
      expect(authentication.passwordIsValid(user, 'enteredPassword')).to.be.true;
    });

    it('returns false if password incorrect', function() {
      expect(authentication.passwordIsValid(user, 'someOtherPassword')).to.be.false;
    });
  });

  describe('requiresApiLogin', function() {
    var req;
    var res;
    var next;
    beforeEach(function() {
      req = {
        headers: {
          authorization: 'Bearer IAmAToken'
        }
      };
      res = sinon.stub({
        status: function() {
        },

        end: function() {
        }
      });
      next = sinon.stub();
    });

    it('Verifies the Authentication token', function() {
      authentication.requiresApiLogin(req, res, next);
      expect(mockJWT.verify.calledOnce).to.be.true;
      expect(mockJWT.verify.calledWith('IAmAToken', 'IAmAFakeCertificate')).to.be.true;
    });

    it('Sets the req.user if the token is valid', function() {
      mockJWT.verify.returns({
        _id: 42,
        userName: 'joe@the.plumber',
        name: 'Jeff'
      });
      authentication.requiresApiLogin(req, res, next);
      expect(req.user).to.deep.equal({
        _id: 42,
        userName: 'joe@the.plumber',
        name: 'Jeff'
      });
    });

    it('does not set the req.user if there is no token', function() {
      req.headers = {};
      mockJWT.verify.returns('Something');
      mockJWT.verify.throws('InvalidToken');
      authentication.requiresApiLogin(req, res, next);
      expect(req.user).to.not.exist;
    });

    it('does not set the req.user if the token is invalid', function() {
      mockJWT.verify.returns('Something');
      mockJWT.verify.throws('InvalidToken');
      authentication.requiresApiLogin(req, res, next);
      expect(req.user).to.not.exist;
    });

    it('Goes on to the next thing if authenticated', function() {
      mockJWT.verify.returns('something');
      authentication.requiresApiLogin(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
      expect(res.end.called).to.be.false;
    });

    it('sets a status 401 if not authenticated', function() {
      mockJWT.verify.throws('InvalidToken');
      authentication.requiresApiLogin(req, res, next);
      expect(next.called).to.be.false;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.end.calledOnce).to.be.true;
    });
  });

  describe('requiresRole', function() {
    var req;
    var res;
    var next;
    beforeEach(function() {
      req = {
        headers: {
          authorization: 'Bearer IAmAToken'
        }
      };
      res = sinon.stub({
        status: function() {
        },

        end: function() {
        }
      });
      next = sinon.stub();
    });

    it('sets a status 401 if not authenticated', function() {
      mockJWT.verify.throws('InvalidToken');
      authentication.requiresRole('rye')(req, res, next);
      expect(next.called).to.be.false;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.end.calledOnce).to.be.true;
    });

    it('sets a status of 403 if not authorized', function() {
      mockJWT.verify.returns({
        roles: ['rye', 'wheat']
      });
      authentication.requiresRole('white')(req, res, next);
      expect(next.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.end.calledOnce).to.be.true;
    });

    it('moves to the next thing if authenticated and authorized', function() {
      mockJWT.verify.returns({
        roles: ['rye', 'wheat']
      });
      authentication.requiresRole('rye')(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
      expect(res.end.called).to.be.false;
    });
  });

  describe('requiresRoleOrIsCurrentUser', function() {
    var req;
    var res;
    var next;
    beforeEach(function() {
      req = sinon.stub({
        isAuthenticated: function() {
        },

        params: {
          id: 1
        },
        headers: {
          authorization: 'Bearer IAmAToken'
        }
      });
      res = sinon.stub({
        status: function() {
        },

        end: function() {
        }
      });
      next = sinon.stub();
    });

    it('Should set a status 401 if not authenticated', function() {
      mockJWT.verify.throws('InvalidToken');
      authentication.requiresRoleOrIsCurrentUser('rye')(req, res, next);
      expect(next.called).to.be.false;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.end.calledOnce).to.be.true;
    });

    it('Should set a status of 403 if not authorized and not current user', function() {
      mockJWT.verify.returns({
        _id: 2,
        roles: ['rye', 'wheat']
      });
      authentication.requiresRoleOrIsCurrentUser('white')(req, res, next);
      expect(next.called).to.be.false;
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.end.calledOnce).to.be.true;
    });

    it('Should move to the next thing if authenticated and authorized but not current user', function() {
      mockJWT.verify.returns({
        _id: 2,
        roles: ['rye', 'wheat']
      });
      authentication.requiresRoleOrIsCurrentUser('rye')(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
      expect(res.end.called).to.be.false;
    });

    it('Should move to the next thing if authenticated and not authorized but is current user', function() {
      mockJWT.verify.returns({
        _id: 1,
        roles: ['rye', 'wheat']
      });
      authentication.requiresRoleOrIsCurrentUser('white')(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
      expect(res.end.called).to.be.false;
    });
  });
});
