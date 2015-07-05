'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var request = require('supertest');
var proxyquire = require('proxyquire');
var serveStatic = require('serve-static');

describe('Basic Routes', function() {
  var app;

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
  });

  describe('login', function() {
    var authCalled;
    var authStub = {
      authenticate: function(req, res, next) {
        authCalled = true;
        res.send({
          success: true
        });
      }
    };
    beforeEach(function() {
      authCalled = false;
      proxyquire('../../src/config/routes', {
        '../services/authentication': authStub
      })(app);
    });

    it('calls authenticate', function(done) {
      request(app)
        .post('/login')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(authCalled).to.be.true;
          done();
        });
    });
  });
});