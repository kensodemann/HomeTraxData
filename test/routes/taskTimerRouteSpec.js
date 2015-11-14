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

  var myFirstTimesheet = '55442235703ff40000b39fe7';
  var myOtherTimesheet = '55456b39adb3b10000a4228a';
  var otherPersonTimesheet = '557b9c1e58ce2e0a15208da6';

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
    loadTimesheets(done);
  });

  beforeEach(function(done) {
    loadTaskTimers(done);
  });

  beforeEach(function() {
    require('../../src/repositories/timesheets')(app);
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
        .get('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns all of the task timers for the specified timesheet if the timesheet is for the current user', function(done) {
      request(app)
        .get('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(4);
          done();
        });
    });

    it('returns no task timers if the speified timesheet is not for the current user', function(done) {
      request(app)
        .get('/timesheets/' + otherPersonTimesheet._id.toString() + '/taskTimers')
        .end(function(err, res) {
          expect(res.status).to.equal(403);
          expect(res.body).to.deep.equal({});
          done();
        });
    });
  });

  describe('create POST', function() {
    it('requires an API login', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers')
        .send({
          isActive: false,
          workDate: '2015-09-13',
          milliseconds: 1232000,
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

    it('saves the new taskTimer setting the timesheetRid to the specified timesheet', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers')
        .send({
          isActive: false,
          workDate: '2015-09-13',
          milliseconds: 1232000,
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
            expect(tts.length).to.equal(10);
            db.taskTimers.findOne({
              'project.jiraTaskId': 'WPM-348'
            }, function(err, tt) {
              expect(tt.timesheetRid.toString()).to.equal(myFirstTimesheet._id.toString());
              done();
            });
          });
        });
    });

    it('returns status 403 if the timesheet is for a different user', function(done) {
      request(app)
        .post('/timesheets/' + otherPersonTimesheet._id.toString() + '/taskTimers')
        .send({
          isActive: false,
          workDate: '2015-09-13',
          milliseconds: 1232000,
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
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('returns status 404 if the timesheet does not exist', function(done) {
      request(app)
        .post('/timesheets/553108b1f564c6630cc2419e/taskTimers')
        .send({
          isActive: false,
          workDate: '2015-09-13',
          milliseconds: 1232000,
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
          expect(res.status).to.equal(404);
          done();
        });
    });
  });

  describe('update POST', function() {
    it('requires an API login', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString())
        .send(myFavoriteTaskTimer)
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns 403 if the specified timesheet is not for the current user', function(done) {
      notMyTaskTimer.name = 'should not edit this';
      request(app)
        .post('/timesheets/' + otherPersonTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString())
        .send(notMyTaskTimer)
        .end(function(err, res) {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('saves the changes to the existing taskTimer', function(done) {
      myFavoriteTaskTimer.name = 'some other name';
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString())
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

    it('returns status 404 if the timesheet does not exist', function(done) {
      request(app)
        .post('/timesheets/553108b1f564c6630cc2419e/taskTimers/' + myFavoriteTaskTimer._id.toString())
        .send({
          isActive: false,
          workDate: '2015-09-13',
          milliseconds: 1232000,
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
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('returns 404 if the task timer does not exist for this given timesheet', function(done) {
      myFavoriteTaskTimer.name = 'some other name';
      request(app)
        .post('/timesheets/' + myOtherTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString())
        .send(myFavoriteTaskTimer)
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });
  });

  function loadTimesheets(done) {
    db.timesheets.remove(function() {
      db.timesheets.insert({
        userRid: new ObjectId(myUserId),
        endDate: '2015-09-18'
      }, function(err, timesheet) {
        myFirstTimesheet = timesheet;
        db.timesheets.insert({
          userRid: new ObjectId(myUserId),
          endDate: '2015-10-20'
        }, function(err, timesheet) {
          myOtherTimesheet = timesheet;
          db.timesheets.insert({
            userRid: new ObjectId(otherUserId),
            endDate: '2015-09-18'
          }, function(err, timesheet) {
            otherPersonTimesheet = timesheet;
            done();
          });
        });
      });
    });
  }

  function loadTaskTimers(done) {
    db.taskTimers.remove(function() {
      db.taskTimers.insert([{
        isActive: false,
        workDate: '2015-09-13',
        milliseconds: 1232000,
        userRid: new ObjectId(myUserId),
        timesheetRid: new ObjectId(myFirstTimesheet._id),
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
        milliseconds: 2939000,
        userRid: new ObjectId(otherUserId),
        timesheetRid: new ObjectId(otherPersonTimesheet._id),
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
        milliseconds: 736000,
        userRid: new ObjectId(otherUserId),
        timesheetRid: new ObjectId(otherPersonTimesheet._id),
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
        milliseconds: 4359000,
        userRid: new ObjectId(myUserId),
        timesheetRid: new ObjectId(myFirstTimesheet._id),
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
        milliseconds: 2754000,
        userRid: new ObjectId(myUserId),
        timesheetRid: new ObjectId(myFirstTimesheet._id),
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
        milliseconds: 11432000,
        userRid: new ObjectId(otherUserId),
        timesheetRid: new ObjectId(otherPersonTimesheet._id),
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
        milliseconds: 5534000,
        userRid: new ObjectId(myUserId),
        timesheetRid: new ObjectId(myFirstTimesheet._id),
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
        workDate: '2015-10-12',
        milliseconds: 5534000,
        userRid: new ObjectId(myUserId),
        timesheetRid: new ObjectId(myOtherTimesheet._id),
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
        workDate: '2015-10-14',
        milliseconds: 5534000,
        userRid: new ObjectId(myUserId),
        timesheetRid: new ObjectId(myOtherTimesheet._id),
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
    db.taskTimers.remove(function() {
      db.timesheets.remove(done);
    });
  }
});
