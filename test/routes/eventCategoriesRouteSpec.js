'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../../src/config/database');

describe('api/eventCategories Routes', function() {
  var app;
  var myFavoriteCategory;
  var authStub = {
    requiresApiLogin: function(req, res, next) {
      requiresApiLoginCalled = true;
      next();
    }
  };
  var requiresApiLoginCalled;

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
  });

  beforeEach(function(done) {
    loadData(done);
  });

  beforeEach(function() {
    requiresApiLoginCalled = false;
    proxyquire('../../src/repositories/eventCategories', {
      '../services/authentication': authStub
    })(app);
  });

  afterEach(function(done) {
    removeData(done);
  });

  describe('GET', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/api/eventCategories')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns event categories', function(done) {
      request(app)
        .get('/api/eventCategories')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(4);
          done();
        });
    });
  });

  describe('POST', function() {
    it('requires an API login', function(done) {
      request(app)
        .post('/api/eventCategories')
        .send({
          name: 'this is a name'
        })
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('saves the event category', function(done) {
      request(app)
        .post('/api/eventCategories')
        .send({
          name: 'this is a name'
        })
        .end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.equal(201);
          db.eventCategories.find(function(err, cats) {
            expect(cats.length).to.equal(5);
            done();
          });
        });
    });

    it('saves specified event category', function(done) {
      request(app)
        .post('/api/eventCategories/' + myFavoriteCategory._id.toString())
        .send({
          _id: 1,
          name: 'this is a name'
        })
        .end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.equal(200);
          db.eventCategories.findOne({_id: myFavoriteCategory._id}, function(err, cat) {
            expect(cat.name).to.equal('this is a name');
            db.eventCategories.find(function(err, cats) {
              expect(cats.length).to.equal(4);
              done();
            });
          });
        });
    });
  });

  function loadData(done) {
    db.eventCategories.remove(function() {
      db.eventCategories.insert([{
        name: 'Test'
      }, {
        name: 'Health & Fitness'
      }, {
        name: 'Sexual Relations'
      }, {
        name: 'Family & Friends'
      }], function() {
        db.eventCategories.findOne({
          name: 'Sexual Relations'
        }, function(err, e) {
          myFavoriteCategory = e;
          done();
        });
      });
    });
  }

  function removeData(done) {
    db.eventCategories.remove(function() {
      done();
    });
  }
})
;