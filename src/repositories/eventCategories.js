'use strict';

var authentication = require('../services/authentication');
var db = require('../config/database');
var redirect = require('../services/redirect');
var RepositoryBase = require('./RepositoryBase');
var util = require('util');

function EventCategories(){
  RepositoryBase.call(this);
  this.collection = db.eventCategories;
}

util.inherits(EventCategories, RepositoryBase);

var repository = new EventCategories();

module.exports = function(app){
  app.get('/eventCategories', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {repository.get(req, res);});

  app.post('/eventCategories/:id?', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {repository.save(req, res);});
};
