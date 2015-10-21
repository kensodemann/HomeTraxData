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
  this.criteria = {
    userRid: new ObjectId(req.user._id)
  };
  return RepositoryBase.prototype.get.call(this, req, res);
};

var repository = new TaskTimers();

module.exports = function(app) {
  app.get('/TaskTimers', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.get(req, res);
    });
};
