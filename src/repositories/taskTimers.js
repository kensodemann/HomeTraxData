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
  this.criteria = currentUserPredicate(req);
  return RepositoryBase.prototype.get.call(this, req, res);
};

TaskTimers.prototype.preSaveAction = function(req, done) {
  req.body.userRid = new ObjectId(req.user._id);
  return RepositoryBase.prototype.preSaveAction.call(this, req, done);
};

TaskTimers.prototype.preCheckStatus = function(req, done) {
  this.criteria = currentUserPredicate(req);
  return RepositoryBase.prototype.preCheckStatus.call(this, req, done);
};

function currentUserPredicate(req) {
  return {
    userRid: new ObjectId(req.user._id)
  };
}

var repository = new TaskTimers();

module.exports = function(app) {
  app.get('/TaskTimers', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.get(req, res);
    });

  app.post('/TaskTimers/:id?', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.save(req, res);
    });
};
