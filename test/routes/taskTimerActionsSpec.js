'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../../src/config/database');
var sinon = require('sinon');
var ObjectId = require('mongojs').ObjectId;

describe('task timer action routes', function() {
  var app;
  var clock;
  var testUser;

  var myUserId = '561fa1b20e9397e10490f227';
  var otherUserId = '561fa1b20e9397e10490f228';

  var myFirstTimesheet;
  var myOtherTimesheet;
  var otherPersonTimesheet;

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
    clock = sinon.useFakeTimers('Date');
  });

  beforeEach(function() {
    require('../../src/repositories/timesheets')(app);
  });

  beforeEach(function() {
    requiresApiLoginCalled = false;
    proxyquire('../../src/repositories/taskTimerActions', {
      '../services/authentication': authStub
    })(app);
  });

  afterEach(function(done) {
    removeData(done);
  });

  afterEach(function() {
    clock.restore();
  });

  describe('start timer', function() {
    it('requires an API login', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/start')
        .send()
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns 404 if the timesheet does not exist', function(done) {
      request(app)
        .post('/timesheets/553108b1f564c6630cc2419e/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/start')
        .send().end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('returns 404 if the task timer does not exist', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/553108b1f564c6630cc2419e/start')
        .send().end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('returns 404 if the task timer does not exist for this given timesheet', function(done) {
      request(app)
        .post('/timesheets/' + myOtherTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/start')
        .send()
        .end(function(req, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('returns 403 if the timer belongs to a timesheet for a different user', function(done) {
      request(app)
        .post('/timesheets/' + otherPersonTimesheet._id.toString() + '/taskTimers/' + notMyTaskTimer._id.toString() + '/start')
        .send().end(function(err, res) {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('returns a 200 status on success', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/start')
        .send()
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          done();
        });
    });

    it('sets the task timer start time to the current time', function(done) {
      clock.tick(15488594);
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/start')
        .send()
        .end(function() {
          db.taskTimers.findOne({
            _id: myFavoriteTaskTimer._id
          }, function(err, timer) {
            expect(timer.startTime).to.equal(15488594);
            done();
          });
        });
    });

    it('sets the task active', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/start')
        .send()
        .end(function() {
          db.taskTimers.findOne({
            _id: myFavoriteTaskTimer._id
          }, function(err, timer) {
            expect(timer.isActive).to.be.true;
            done();
          });
        });
    });

    describe('if the user has another active timer', function() {
      var myActiveTimerId;
      var myOtherActiveTimerId;
      var otherUserActiveTimerId;

      beforeEach(function(done) {
        db.taskTimers.save({
          isActive: true,
          workDate: '2015-08-14',
          milliseconds: 4359000,
          startTime: 73000,
          userRid: new ObjectId(myUserId)
        }, function(err, timer) {
          myActiveTimerId = timer._id;
          done();
        });
      });

      beforeEach(function(done) {
        db.taskTimers.save({
          isActive: true,
          workDate: '2015-08-14',
          milliseconds: 4359000,
          startTime: 42000,
          userRid: new ObjectId(myUserId)
        }, function(err, timer) {
          myOtherActiveTimerId = timer._id;
          done();
        });
      });

      beforeEach(function(done) {
        db.taskTimers.save({
          isActive: true,
          workDate: '2015-08-14',
          milliseconds: 4359000,
          startTime: 42000,
          userRid: new ObjectId(otherUserId)
        }, function(err, timer) {
          otherUserActiveTimerId = timer._id;
          done();
        });
      });

      it('sets the other timers inactive', function(done) {
        request(app)
          .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/start')
          .send()
          .end(function() {
            db.taskTimers.findOne({
              _id: myActiveTimerId
            }, function(err, timer) {
              expect(timer.isActive).to.be.false;
              db.taskTimers.findOne({
                _id: myOtherActiveTimerId
              }, function(err, timer) {
                expect(timer.isActive).to.be.false;
                done();
              });
            });
          });
      });

      it('calculates the time delta for the other timers and adds it to their cummulative time', function(done) {
        clock.tick(314000);
        request(app)
          .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/start')
          .send()
          .end(function() {
            db.taskTimers.findOne({
              _id: myActiveTimerId
            }, function(err, timer) {
              expect(timer.milliseconds).to.equal(4600000);
              db.taskTimers.findOne({
                _id: myOtherActiveTimerId
              }, function(err, timer) {
                expect(timer.milliseconds).to.equal(4631000);
                done();
              });
            });
          });
      });

      it('does not touch the active timers of other users', function(done) {
        request(app)
          .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/start')
          .send()
          .end(function() {
            db.taskTimers.findOne({
              _id: otherUserActiveTimerId
            }, function(err, timer) {
              expect(timer.isActive).to.be.true;
              done();
            });
          });
      });
    });
  });

  describe('stop timer', function() {
    beforeEach(function(done) {
      db.taskTimers.findOne({
        _id: myFavoriteTaskTimer._id
      }, function(err, timer) {
        timer.isActive = true;
        timer.milliseconds = 1234000;
        timer.startTime = 89000;
        db.taskTimers.save(timer, function() {
          done();
        });
      });
    });

    it('requires an API login', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/stop')
        .send()
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns 404 if the timesheet does not exist', function(done) {
      request(app)
        .post('/timesheets/553108b1f564c6630cc2419e/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/stop')
        .send()
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('returns 404 if the task timer does not exist', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/553108b1f564c6630cc2419e/stop')
        .send().end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('returns 404 if the task timer does not exist for this given timesheet', function(done) {
      request(app)
        .post('/timesheets/' + myOtherTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/stop')
        .send()
        .end(function(req, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('returns 403 if the timer belongs to a timesheet for a different user', function(done) {
      request(app)
        .post('/timesheets/' + otherPersonTimesheet._id.toString() + '/taskTimers/' + notMyTaskTimer._id.toString() + '/stop')
        .send().end(function(err, res) {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('returns a 200 status on success', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/stop')
        .send()
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          done();
        });
    });


    it('sets the task inactive', function(done) {
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/stop')
        .send()
        .end(function() {
          db.taskTimers.findOne({
            _id: myFavoriteTaskTimer._id
          }, function(err, timer) {
            expect(timer.isActive).to.be.false;
            done();
          });
        });
    });

    it('calculates the time delta and adds it to the cummulative time', function(done) {
      clock.tick(99000);
      request(app)
        .post('/timesheets/' + myFirstTimesheet._id.toString() + '/taskTimers/' + myFavoriteTaskTimer._id.toString() + '/stop')
        .send()
        .end(function() {
          db.taskTimers.findOne({
            _id: myFavoriteTaskTimer._id
          }, function(err, timer) {
            expect(timer.milliseconds).to.equal(1244000);
            done();
          });
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
        isActive: false,
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
        isActive: false,
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
          milliseconds: 2754000,
          userRid: new ObjectId(myUserId)
        }, function(err, tt) {
          myFavoriteTaskTimer = tt;
          db.taskTimers.findOne({
            milliseconds: 11432000,
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
