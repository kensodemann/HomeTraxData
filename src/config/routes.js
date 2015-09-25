'use strict';

var authentication = require('../services/authentication');
var redirect = require('../services/redirect');

module.exports = function(app) {
  require('../repositories/currentUser')(app);
  require('../repositories/users')(app);
  require('../repositories/versions')(app);

  app.post('/login', redirect.toHttps, function(req, res) {authentication.authenticate(req, res);});

  app.post('/logout', function(req, res) {
    req.logout();
    res.end();
  });
};
