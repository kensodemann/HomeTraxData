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
  var myFavoriteTaskTimer;
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
    proxyquire('../../src/repositories/taskTimers', {
      '../services/authentication': authStub
    })(app);
  });

  afterEach(function(done) {
    removeData(done);
  });

  describe('GET Collection', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/taskTimers')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns all of the task timers for the current user', function(done) {
      request(app)
        .get('/taskTimers')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(4);
          done();
        });
    });
  });

  function loadData(done) {
    db.taskTimers.remove(function() {
      db.taskTimers.insert([{
        name: 'Create Data Route',
        jiraTaskId: 'WPM-345',
        sbvbTaskId: 'RFP12234',
        isActive: false,
        workDate: '2015-09-13',
        seconds: 1232,
        userRid: new ObjectId('561fa1b20e9397e10490f227'),
        task: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Coding',
          sbvbStage: 4
        }
      },{
        name: 'Create Data Route',
        jiraTaskId: 'WPM-345',
        sbvbTaskId: 'RFP12234',
        isActive: false,
        workDate: '2015-09-13',
        seconds: 2939,
        userRid: new ObjectId('561fa1b20e9397e10490f228'),
        task: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Design',
          sbvbStage: 3
        }
      },{
        name: 'Create Data Route',
        jiraTaskId: 'WPM-345',
        sbvbTaskId: 'RFP12234',
        isActive: false,
        workDate: '2015-09-14',
        seconds: 736,
        userRid: new ObjectId('561fa1b20e9397e10490f228'),
        task: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Coding',
          sbvbStage: 4
        }
      },{
        name: 'Do Something Else',
        jiraTaskId: 'WPM-123',
        sbvbTaskId: 'RFP12235',
        isActive: false,
        workDate: '2015-09-14',
        seconds: 4359,
        userRid: new ObjectId('561fa1b20e9397e10490f227'),
        task: {
          _id: new ObjectId('561fa1b20e9397e10490f232'),
          name: 'Design',
          sbvbStage: 3
        }
      },{
        name: 'Create Data Route',
        jiraTaskId: 'WPM-345',
        sbvbTaskId: 'RFP12234',
        isActive: true,
        workDate: '2015-09-15',
        seconds: 2754,
        userRid: new ObjectId('561fa1b20e9397e10490f227'),
        task: {
          _id: new ObjectId('561fa1b20e9397e10490f232'),
          name: 'Design',
          sbvbStage: 3
        }
      },{
        name: 'Do Something Else',
        jiraTaskId: 'WPM-123',
        sbvbTaskId: 'RFP12235',
        isActive: true,
        workDate: '2015-09-14',
        seconds: 11432,
        userRid: new ObjectId('561fa1b20e9397e10490f228'),
        task: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Coding',
          sbvbStage: 4
        }
      },{
        name: 'Do Something Else',
        jiraTaskId: 'WPM-123',
        sbvbTaskId: 'RFP12235',
        isActive: false,
        workDate: '2015-09-12',
        seconds: 5534,
        userRid: new ObjectId('561fa1b20e9397e10490f227'),
        task: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Coding',
          sbvbStage: 4
        }
      }], function() {
        db.taskTimers.findOne({
          isActive: true
        }, function(err, e) {
          myFavoriteTaskTimer = e;
          done();
        });
      });
    });
  }

  function removeData(done) {
    db.taskTimers.remove(function() {
      done();
    });
  }
});
