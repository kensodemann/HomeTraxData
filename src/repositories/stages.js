'use strict';

var authentication = require('../services/authentication');
var db = require('../config/database');
var redirect = require('../services/redirect');
var RepositoryBase = require('./RepositoryBase');
var util = require('util');

function Stages() {
  RepositoryBase.call(this);
  this.collection = db.stages;
}

util.inherits(Stages, RepositoryBase);

var repository = new Stages();

module.exports = function(app) {
  app.get('/stages', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {
      repository.get(req, res);
    });
};
