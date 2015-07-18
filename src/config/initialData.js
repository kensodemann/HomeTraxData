'use strict';

var colors = require('../services/colors');
var db = require('./database');
var encryption = require('../services/encryption');

module.exports = function() {
  createDefaultAdministrator();
  createDefaultHousehold();
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
        colors: colors.getPallet(0),
        roles: ['admin']
      });
    }
  });
}

function createDefaultHousehold() {
  db.entities.find({entityType: 'household'}, function(err, h) {
    if (h.length === 0) {
      db.entities.save({
        name: 'My House',
        addressLine1: 'In the middle of my street',
        entityType: 'household'
      });
    }
  });
}