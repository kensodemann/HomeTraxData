'use strict';

var authentication = require('../services/authentication');
var db = require('../config/database');
var ObjectId = require('mongojs').ObjectId;
var redirect = require('../services/redirect');

function startTimer(req, res) {
  getTimer(req, function(err, timer) {
    var status = getStatus(req, timer);
    if (status !== 200) {
      res.status(status);
      return res.send();
    }

    setOtherTimersInactive(req, function() {
      var startTime = new Date();
      timer.isActive = true;
      timer.startTime = startTime.getTime();
      db.taskTimers.save(timer, function(err, timer) {
        res.send(timer);
      });
    });
  });
}

function stopTimer(req, res) {
  getTimer(req, function(err, timer) {
    var status = getStatus(req, timer);
    if (status !== 200) {
      res.status(status);
      return res.send();
    }

    inactivate(timer);
    db.taskTimers.save(timer, function(err, timer) {
      res.send(timer);
    });
  });
}

function getTimer(req, done) {
  var criteria = taskTimerPredicate(req);
  db.taskTimers.findOne(criteria, done);
}

function taskTimerPredicate(req) {
  return {
    _id: new ObjectId(req.params.id),
    timesheetRid: req.timesheet._id
  };
}

function getStatus(req, timer) {
  if (!timer) {
    return 404;
  }

  if (timer.userRid.toString() !== req.user._id.toString()) {
    return 403;
  }

  return 200;
}

function setOtherTimersInactive(req, done) {
  var criteria = {
    userRid: new ObjectId(req.user._id),
    isActive: true
  };

  db.taskTimers.find(criteria, function(err, timers) {
    timers.forEach(function(timer) {
      inactivate(timer);
      db.taskTimers.save(timer);
    });

    done();
  });
}

function inactivate(timer) {
  var now = (new Date()).getTime();
  var addSeconds = Math.round((now - timer.startTime) / 1000);
  timer.seconds = (timer.seconds || 0) + addSeconds;
  timer.isActive = false;
  timer.startTime = 0;
}


module.exports = function(app) {
  app.post('/timesheets/:timesheetRid/taskTimers/:id/start', redirect.toHttps, authentication.requiresApiLogin, startTimer);
  app.post('/timesheets/:timesheetRid/taskTimers/:id/stop', redirect.toHttps, authentication.requiresApiLogin, stopTimer);
};
