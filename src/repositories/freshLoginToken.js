'use strict';

var authentication = require('../services/authentication');
var redirect = require('../services/redirect');

module.exports = function(app) {
  app.get('/freshLoginToken', redirect.toHttps, authentication.requiresApiLogin, authentication.refreshToken);
};
