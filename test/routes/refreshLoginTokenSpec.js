'use strict';

var bodyParser = require('body-parser');
var expect = require('chai').expect;
var express = require('express');
var proxyquire = require('proxyquire');
var request = require('supertest');

describe('refreshLoginToken', function() {
  var app;
  var testUser;

  var authStub = {
    requiresApiLogin: function(req, res, next) {
      req.user = testUser;
      requiresApiLoginCalled = true;
      next();
    },

    refreshToken: function(req, res) {
      res.send({
        success: true,
        token: 'IAmAFakeToken'
      });
    }
  };
  var requiresApiLoginCalled;

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    proxyquire('../../src/repositories/refreshLoginToken', {
      '../services/authentication': authStub
    })(app);
  });

  describe('GET', function() {
    beforeEach(function() {
      requiresApiLoginCalled = false;
    });

    it('requires API login', function(done) {
      request(app)
        .get('/refreshLoginToken')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns the result of the refresh token', function(done) {
      request(app)
        .get('/refreshLoginToken')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.equal({
            success: true,
            token: 'IAmAFakeToken'
          });
          done();
        });
    });
  });
});
