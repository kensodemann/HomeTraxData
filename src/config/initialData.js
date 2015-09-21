'use strict';

var db = require('./database');
var encryption = require('../services/encryption');

module.exports = function() {
  createDefaultAdministrator();
};

function createDefaultAdministrator() {
  db.users.find({
    isDefaultAdmin: true
  }, function(err, users) {
    if (users.length === 0) {
      var salt = encryption.createSalt();
      var hash = encryption.hash(salt, 'the default admin password');
      db.users.save({
        firstName: 'Default',
        lastName: 'Administrator',
        username: 'admin',
        salt: salt,
        hashedPassword: hash,
        isDefaultAdmin: true,
        roles: ['admin']
      });
    }
  });
}
