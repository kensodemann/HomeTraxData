'use strict';

var _ = require('underscore');
var bodyParser = require('body-parser');
var db = require('../config/database');
var expect = require('chai').expect;
var express = require('express');
var proxyquire = require('proxyquire');
var request = require('supertest');

describe('currentUser', function() {
  var app;
  var testUser;

  var authStub = {
    requiresApiLogin: function(req, res, next) {
      req.user = testUser;
      requiresApiLoginCalled = true;
      next();
    }
  };
  var requiresApiLoginCalled;

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());

    proxyquire('./currentUser', {
      '../services/authentication': authStub
    })(app);
  });

  describe('GET', function() {
    beforeEach(function(done) {
      loadUsers(done);
      requiresApiLoginCalled = false;
    });

    afterEach(function(done) {
      db.users.remove(function() {
        done();
      });
    });

    it('requires API login', function(done) {
      request(app)
        .get('/currentUser')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns the user set in the req', function(done){
      var expectedValue = _.extend({}, testUser);
      expectedValue._id = expectedValue._id.toString();
      request(app)
        .get('/currentUser')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body).to.deep.equal(expectedValue);
          done();
        });
    });
  });

  function loadUsers(done) {
    db.users.remove({}, function() {
      db.users.insert([{
        firstName: 'Ken',
        lastName: 'Sodemann',
        salt: 'NaCl',
        hashedPassword: 'GoldenCrisp',
        roles: ['wizard', 'admin']
      }, {
        firstName: 'Lisa',
        lastName: 'Buerger',
        salt: 'CaCl2',
        hashedPassword: 'BlackGold',
        roles: ['elf', 'warrior', 'qtpi']
      }, {
        firstName: 'Geoff',
        lastName: 'Jones',
        salt: 'CH3COONa',
        hashedPassword: 'BlackStickyTar',
        roles: ['ork']
      }], function() {
        db.users.findOne({firstName: 'Lisa'}, function(err, user) {
          testUser = user;
          done();
        });
      });
    });
  }
});
