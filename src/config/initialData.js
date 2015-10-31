'use strict';

var db = require('./database');
var encryption = require('../services/encryption');

module.exports = function() {
  createDefaultAdministrator();
  createStages();
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

function createStages() {
  var stages = defaultStages();
  stages.forEach(function(stage) {
    db.stages.find({
      stageNumber: stage.stageNumber
    }, addIfMissing);

    function addIfMissing(err, s) {
      if (s.length === 0) {
        db.stages.save(stage);
      }
    }
  });
}

function defaultStages() {
  return [{
    stageNumber: 1,
    name: 'Requirements Definition'
  }, {
    stageNumber: 2,
    name: 'Functional Specification'
  }, {
    stageNumber: 3,
    name: 'Detailed Design'
  }, {
    stageNumber: 4,
    name: 'Coding'
  }, {
    stageNumber: 5,
    name: 'Test Case/Environment Creation'
  }, {
    stageNumber: 6,
    name: 'Documentation'
  }, {
    stageNumber: 7,
    name: 'Alpha Testing'
  }, {
    stageNumber: 8,
    name: 'Repair of Defects'
  }, {
    stageNumber: 9,
    name: 'Beta Testing'
  }, {
    stageNumber: 10,
    name: 'Project Management'
  }, {
    stageNumber: 11,
    name: 'Release Integration'
  }, {
    stageNumber: 12,
    name: 'Anticipated Change Orders'
  }, {
    stageNumber: 13,
    name: 'Anticipated Back-In Costs'
  }, {
    stageNumber: 14,
    name: 'Quote Rounding/Adjustment'
  }, {
    stageNumber: 15,
    name: 'Code Review'
  }];
}
