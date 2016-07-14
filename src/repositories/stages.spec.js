'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../config/database');

describe('timesheets routes', function() {
  var app;
  var authStub = {
    requiresApiLogin: function(req, res, next) {
      requiresApiLoginCalled = true;
      next();
    }
  };
  var requiresApiLoginCalled;

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({
      extended: true
    }));
    app.use(bodyParser.json());
  });

  beforeEach(function(done) {
    loadData(done);
  });

  beforeEach(function() {
    requiresApiLoginCalled = false;
    proxyquire('./stages', {
      '../services/authentication': authStub
    })(app);
  });

  afterEach(function(done) {
    removeData(done);
  });

  describe('GET Collection', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/stages')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns all of the stages', function(done) {
      request(app)
        .get('/stages')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(6);
          done();
        });
    });
  });

  function loadData(done) {
    db.stages.remove(function() {
      db.stages.insert([{
        stageNumber: 1,
        name: 'Requirements Definition'
      }, {
        stageNumber: 2,
        name: 'Functional Specifications'
      }, {
        stageNumber: 3,
        name: 'Detailed Design'
      }, {
        stageNumber: 4,
        name: 'Program Development'
      }, {
        stageNumber: 10,
        name: 'Project Management'
      }, {
        stageNumber: 15,
        name: 'Code Review'
      }], done);
    });
  }

  function removeData(done) {
    db.stages.remove(done);
  }
});
