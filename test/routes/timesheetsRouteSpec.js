'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../../src/config/database');
var ObjectId = require('mongojs').ObjectId;

describe('projects routes', function() {
  var app;
  var testUser;
  var authStub = {
    requiresApiLogin: function(req, res, next) {
      req.user = testUser;
      requiresApiLoginCalled = true;
      next();
    }
  };
  var myFavoriteTimesheet;
  var notMyTimesheet;
  var requiresApiLoginCalled;

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
  });

  beforeEach(function() {
    testUser = {
      _id: new ObjectId('561fa1b20e9397e10490f227')
    };
  });

  beforeEach(function(done) {
    loadData(done);
  });

  beforeEach(function() {
    requiresApiLoginCalled = false;
    proxyquire('../../src/repositories/timesheets', {
      '../services/authentication': authStub
    })(app);
  });

  afterEach(function(done) {
    removeData(done);
  });

  describe('GET Collection', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/timesheets')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns all of the timesheets for the current user', function(done) {
      request(app)
        .get('/timesheets')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(5);
          done();
        });
    });
  });

  describe('GET single timesheet', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/timesheets/' + myFavoriteTimesheet._id.toString())
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns just the specified timesheet', function(done) {
      request(app)
        .get('/timesheets/' + myFavoriteTimesheet._id.toString())
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          myFavoriteTimesheet._id = myFavoriteTimesheet._id.toString();
          myFavoriteTimesheet.userRid = myFavoriteTimesheet.userRid.toString();
          expect(res.body).to.deep.equal(myFavoriteTimesheet);
          done();
        });
    });

    it('returns 404 if specified timesheet is for a different user', function(done) {
      request(app)
        .get('/timesheets/' + notMyTimesheet._id.toString())
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });
  });

  describe('POST', function() {
    it('requires an API login call', function(done) {
      request(app)
        .post('/timesheets')
        .send({
          beginDate: '2015-11-01',
          endDate: '2015-11-07'
        })
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('saves the new timesheet for the current user', function(done) {
      request(app)
        .post('/timesheets')
        .send({
          beginDate: '2015-11-01',
          endDate: '2015-11-07'
        })
        .end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.equal(201);
          db.timesheets.find({}, function(err, ts) {
            expect(ts.length).to.equal(10);
            db.timesheets.findOne({
              beginDate: '2015-11-01'
            }, function(err, ts) {
              expect(ts.userRid.toString()).to.equal('561fa1b20e9397e10490f227');
              done();
            });
          });
        });
    });
  });

  function loadData(done) {
    db.timesheets.remove(function() {
      db.timesheets.insert([{
        beginDate: '2015-09-13',
        endDate: '2015-09-19',
        userRid: new ObjectId('561fa1b20e9397e10490f227')
      }, {
        beginDate: '2015-09-13',
        endDate: '2015-09-19',
        userRid: new ObjectId('561fa1b20e9397e10490f228')
      }, {
        beginDate: '2015-09-20',
        endDate: '2015-09-26',
        userRid: new ObjectId('561fa1b20e9397e10490f227')
      }, {
        beginDate: '2015-09-20',
        endDate: '2015-09-26',
        userRid: new ObjectId('561fa1b20e9397e10490f228')
      }, {
        beginDate: '2015-09-27',
        endDate: '2015-10-03',
        userRid: new ObjectId('561fa1b20e9397e10490f227')
      }, {
        beginDate: '2015-09-27',
        endDate: '2015-10-03',
        userRid: new ObjectId('561fa1b20e9397e10490f228')
      }, {
        beginDate: '2015-10-04',
        endDate: '2015-10-10',
        userRid: new ObjectId('561fa1b20e9397e10490f227')
      }, {
        beginDate: '2015-10-04',
        endDate: '2015-10-10',
        userRid: new ObjectId('561fa1b20e9397e10490f228')
      }, {
        beginDate: '2015-10-11',
        endDate: '2015-10-17',
        userRid: new ObjectId('561fa1b20e9397e10490f227')
      }, ], function() {
        db.timesheets.findOne({
          beginDate: '2015-09-27',
          userRid: new ObjectId('561fa1b20e9397e10490f227')
        }, function(err, e) {
          myFavoriteTimesheet = e;
          db.timesheets.findOne({
            beginDate: '2015-09-27',
            userRid: new ObjectId('561fa1b20e9397e10490f228')
          }, function(err, e) {
            notMyTimesheet = e;
            done();
          });
        });
      });
    });
  }

  function removeData(done) {
    db.timesheets.remove(function() {
      done();
    });
  }
});
