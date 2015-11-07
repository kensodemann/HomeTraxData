'use strict';

var authentication = require('../services/authentication');
var db = require('../config/database');
var ObjectId = require('mongojs').ObjectId;
var redirect = require('../services/redirect');
var RepositoryBase = require('./RepositoryBase');
var util = require('util');

function TaskTimers() {
  RepositoryBase.call(this);
  this.collection = db.taskTimers;
}

util.inherits(TaskTimers, RepositoryBase);

TaskTimers.prototype.get = function(req, res) {
  if (timesheetForCurrentUser(req)) {
    this.criteria = timesheetPredicate(req);
    return RepositoryBase.prototype.get.call(this, req, res);
  }

  res.status(403);
  res.send();
};

TaskTimers.prototype.preSaveAction = function(req, done) {
  req.body.timesheetRid = new ObjectId(req.timesheet._id);
  return RepositoryBase.prototype.preSaveAction.call(this, req, done);
};

// TaskTimers.prototype.preCheckStatus = function(req, done) {
//   this.criteria = timesheetPredicate(req);
//   return RepositoryBase.prototype.preCheckStatus.call(this, req, done);
// };

TaskTimers.prototype.save = function(req, res){
  if (timesheetForCurrentUser(req)) {
    return RepositoryBase.prototype.save.call(this, req, res);
  }

  res.status(403);
  res.send();
};

function timesheetForCurrentUser(req) {
  return req.timesheet.userRid.toString() === req.user._id.toString();
}

function timesheetPredicate(req) {
  return {
    timesheetRid: req.timesheet._id
  };
}

var repository = new TaskTimers();

module.exports = function(app) {
  app.get('/timesheets/:timesheetRid/taskTimers', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.get(req, res);
    });

  app.post('/timesheets/:timesheetRid/taskTimers/:id?', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.save(req, res);
    });
};
