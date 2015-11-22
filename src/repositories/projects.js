'use strict';

var authentication = require('../services/authentication');
var db = require('../config/database');
var redirect = require('../services/redirect');
var RepositoryBase = require('./RepositoryBase');
var util = require('util');

function Projects() {
  RepositoryBase.call(this);
  this.collection = db.projects;
}

util.inherits(Projects, RepositoryBase);

var repository = new Projects();

Projects.prototype.validate = function(req, done) {
  if (!req.body) {
    done(null, new Error('The request is empty'));
  }

  if (!req.body.name) {
    done(null, new Error('Name is required'));
  }

  if (!req.body.status) {
    done(null, new Error('Status is required'));
  }

  done(null, null);
};

module.exports = function(app) {
  app.get('/projects', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.get(req, res);
    });

  app.get('/projects/:id', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.getOne(req, res);
    });

  app.post('/projects/:id?', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.save(req, res);
    });
};
