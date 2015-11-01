'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../../src/config/database');
var ObjectId = require('mongojs').ObjectId;

describe('task timer routes', function() {
  var app;
  var testUser;

  var myUserId = '561fa1b20e9397e10490f227';
  var otherUserId = '561fa1b20e9397e10490f228';

  var authStub = {
    requiresApiLogin: function(req, res, next) {
      req.user = testUser;
      requiresApiLoginCalled = true;
      next();
    }
  };
  var myFavoriteTaskTimer;
  var notMyTaskTimer;
  var requiresApiLoginCalled;

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({
      extended: true
    }));
    app.use(bodyParser.json());
  });

  beforeEach(function() {
    testUser = {
      _id: new ObjectId(myUserId)
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

  describe('create POST', function() {
    it('requires an API login', function(done) {
      request(app)
        .post('/taskTimers')
        .send({
          isActive: false,
          workDate: '2015-09-13',
          seconds: 1232,
          project: {
            name: 'Create Data Route',
            jiraTaskId: 'WPM-345',
            sbvbTaskId: 'RFP12234'
          },
          task: {
            _id: new ObjectId('561fa1b20e9397e10490f233'),
            name: 'Design',
            sbvbStage: 3
          }
        }).end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('saves the new taskTimer setting the userRid to the current user', function(done) {
      request(app)
        .post('/taskTimers')
        .send({
          isActive: false,
          workDate: '2015-09-13',
          seconds: 1232,
          project: {
            name: 'This is a new one',
            jiraTaskId: 'WPM-348',
            sbvbTaskId: 'RFP12234'
          },
          task: {
            _id: new ObjectId('561fa1b20e9397e10490f233'),
            name: 'Design',
            sbvbStage: 3
          }
        }).end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.equal(201);
          db.taskTimers.find({}, function(er, tts) {
            expect(tts.length).to.equal(8);
            db.taskTimers.findOne({
              'project.jiraTaskId': 'WPM-348'
            }, function(err, tt) {
              expect(tt.userRid.toString()).to.equal(myUserId);
              done();
            });
          });
        });
    });
  });

  describe('update POST', function() {
    it('requires an API login', function(done) {
      request(app)
        .post('/taskTimers/' + myFavoriteTaskTimer._id.toString())
        .send(myFavoriteTaskTimer)
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns 404 if the item is not for the current user', function(done) {
      notMyTaskTimer.name = 'should not edit this';
      request(app)
        .post('/taskTimers/' + notMyTaskTimer._id.toString())
        .send(notMyTaskTimer)
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('saves the changes to the existing taskTimer', function(done) {
      myFavoriteTaskTimer.name = 'some other name';
      request(app)
        .post('/taskTimers/' + myFavoriteTaskTimer._id.toString())
        .send(myFavoriteTaskTimer)
        .end(function() {
          db.taskTimers.findOne({
            _id: new ObjectId(myFavoriteTaskTimer._id)
          }, function(err, tt) {
            expect(tt.name).to.equal('some other name');
            expect(tt._id.toString()).to.equal(myFavoriteTaskTimer._id.toString());
            done();
          });
        });
    });
  });

  function loadData(done) {
    db.taskTimers.remove(function() {
      db.taskTimers.insert([{
        isActive: false,
        workDate: '2015-09-13',
        seconds: 1232,
        userRid: new ObjectId(myUserId),
        project: {
          name: 'Create Data Route',
          jiraTaskId: 'WPM-345',
          sbvbTaskId: 'RFP12234'
        },
        stage: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Coding',
          sbvbStage: 4
        }
      }, {
        isActive: false,
        workDate: '2015-09-13',
        seconds: 2939,
        userRid: new ObjectId(otherUserId),
        project: {
          name: 'Create Data Route',
          jiraTaskId: 'WPM-345',
          sbvbTaskId: 'RFP12234'
        },
        stage: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Design',
          sbvbStage: 3
        }
      }, {
        isActive: false,
        workDate: '2015-09-14',
        seconds: 736,
        userRid: new ObjectId(otherUserId),
        project: {
          name: 'Create Data Route',
          jiraTaskId: 'WPM-345',
          sbvbTaskId: 'RFP12234'
        },
        stage: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Coding',
          sbvbStage: 4
        }
      }, {
        isActive: false,
        workDate: '2015-09-14',
        seconds: 4359,
        userRid: new ObjectId(myUserId),
        project: {
          name: 'Do Something Else',
          jiraTaskId: 'WPM-123',
          sbvbTaskId: 'RFP12235'
        },
        stage: {
          _id: new ObjectId('561fa1b20e9397e10490f232'),
          name: 'Design',
          sbvbStage: 3
        }
      }, {
        isActive: true,
        workDate: '2015-09-15',
        seconds: 2754,
        userRid: new ObjectId(myUserId),
        project: {
          name: 'Create Data Route',
          jiraTaskId: 'WPM-345',
          sbvbTaskId: 'RFP12234'
        },
        stage: {
          _id: new ObjectId('561fa1b20e9397e10490f232'),
          name: 'Design',
          sbvbStage: 3
        }
      }, {
        isActive: true,
        workDate: '2015-09-14',
        seconds: 11432,
        userRid: new ObjectId(otherUserId),
        project: {
          name: 'Do Something Else',
          jiraTaskId: 'WPM-123',
          sbvbTaskId: 'RFP12235'
        },
        stage: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Coding',
          sbvbStage: 4
        }
      }, {
        isActive: false,
        workDate: '2015-09-12',
        seconds: 5534,
        userRid: new ObjectId(myUserId),
        project: {
          name: 'Do Something Else',
          jiraTaskId: 'WPM-123',
          sbvbTaskId: 'RFP12235'
        },
        stage: {
          _id: new ObjectId('561fa1b20e9397e10490f233'),
          name: 'Coding',
          sbvbStage: 4
        }
      }], function() {
        db.taskTimers.findOne({
          isActive: true,
          userRid: new ObjectId(myUserId)
        }, function(err, tt) {
          myFavoriteTaskTimer = tt;
          db.taskTimers.findOne({
            isActive: true,
            userRid: new ObjectId(otherUserId)
          }, function(err, tt) {
            notMyTaskTimer = tt;
            done();
          });
        });
      });
    });
  }

  function removeData(done) {
    db.taskTimers.remove(done);
  }
});
