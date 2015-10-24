'use strict';

var authentication = require('../services/authentication');
var db = require('../config/database');
var ObjectId = require('mongojs').ObjectId;
var redirect = require('../services/redirect');
var RepositoryBase = require('./RepositoryBase');
var util = require('util');

function Timesheets() {
  RepositoryBase.call(this);
  this.collection = db.timesheets;
}

util.inherits(Timesheets, RepositoryBase);

Timesheets.prototype.get = function(req, res) {
  this.criteria = currentUserPredicate(req);
  return RepositoryBase.prototype.get.call(this, req, res);
};

Timesheets.prototype.getOne = function(req, res) {
  this.criteria = currentUserPredicate(req);
  return RepositoryBase.prototype.getOne.call(this, req, res);
};

Timesheets.prototype.preSaveAction = function(req, done) {
  req.body.userRid = new ObjectId(req.user._id);
  return RepositoryBase.prototype.preSaveAction.call(this, req, done);
};

function currentUserPredicate(req) {
  return {
    userRid: new ObjectId(req.user._id)
  };
}

var repository = new Timesheets();

module.exports = function(app) {
  app.get('/timesheets', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.get(req, res);
    });

  app.get('/timesheets/:id', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.getOne(req, res);
    });

  app.post('/timesheets', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.save(req, res);
    });
};
