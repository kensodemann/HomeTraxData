'use strict';

var authentication = require('../services/authentication');
var redirect = require('../services/redirect');

function get(req, res) {
  res.send(req.user);
}

module.exports = function(app) {
  app.get('/currentUser', redirect.toHttps, authentication.requiresApiLogin, function(req, res) {get(req, res);});
};
