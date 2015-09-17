'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../../src/config/database');
var encryption = require('../../src/services/encryption');

describe('changepassword Route', function() {
  var app;

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
  });

  describe('PUT', function() {
    var authStub;
    var calledWith;
    var testUser;

    beforeEach(function(done) {
      loadUsers(done);
      authStub = {
        requiresRoleOrIsCurrentUser: function(role) {
          return function(req, res, next) {
            calledWith = role;
            next();
          };
        }
      };

      proxyquire('../../src/repositories/users', {
        '../services/authentication': authStub
      })(app);

      function loadUsers(done) {
        var salt = encryption.createSalt();
        var hash = encryption.hash(salt, 'ThisIsFreaky');
        db.users.remove({}, function() {
          db.users.save({
            firstName: 'Ken',
            lastName: 'Sodemann',
            username: 'kws@email.com',
            salt: salt,
            hashedPassword: hash
          }, function() {
            salt = encryption.createSalt();
            hash = encryption.hash(salt, 'IAmSexyBee');
            db.users.save({
              firstName: 'Lisa',
              lastName: 'Buerger',
              username: 'llb@email.com',
              salt: salt,
              hashedPassword: hash
            }, function() {
              db.users.findOne({
                username: 'kws@email.com'
              }, function(err, user) {
                testUser = user;
                done();
              });
            });
          });
        });
      }
    });

    afterEach(function(done) {
      db.users.remove(function() {
        done();
      });
    });

    it('Requires admin or matching current user', function(done) {
      var passwordData = {};
      passwordData.password = 'ThisIsFreaky';
      passwordData.newPassword = 'SomethingValid';
      request(app)
        .put('/changepassword/' + testUser._id)
        .send(passwordData)
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(calledWith).to.equal('admin');
          done();
        });
    });

    it('Requires a valid user _id', function(done) {
      var passwordData = {};
      passwordData.password = 'ThisIsFreaky';
      passwordData.newPassword = 'SomethingValid';
      request(app)
        .put('/changepassword/123456789009876543211234')
        .send(passwordData)
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('Will not allow password change if the old password is invalid', function(done) {
      var passwordData = {};
      passwordData.password = 'SomethingBogus';
      passwordData.newPassword = 'SomethingValid';
      request(app)
        .put('/changepassword/' + testUser._id)
        .send(passwordData)
        .end(function(err, res) {
          expect(res.status).to.equal(403);
          expect(res.body.reason).to.equal('Invalid Password');
          done();
        });
    });

    it('Will not allow password change if the new password is invalid', function(done) {
      var passwordData = {};
      passwordData.password = 'ThisIsFreaky';
      passwordData.newPassword = 'Short';
      request(app)
        .put('/changepassword/' + testUser._id)
        .send(passwordData)
        .end(function(err, res) {
          expect(res.status).to.equal(400);
          expect(res.body.reason).to.equal('New Password must be at least 8 characters long');
          done();
        });
    });

    it('Sets new salt', function(done) {
      var passwordData = {};
      passwordData.password = 'ThisIsFreaky';
      passwordData.newPassword = 'SomethingValid';
      request(app)
        .put('/changepassword/' + testUser._id)
        .send(passwordData)
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          db.users.findOne({
            _id: testUser._id
          }, function(err, user) {
            expect(user.salt).to.not.equal(testUser.salt);
            done();
          });
        });
    });

    it('Sets the password', function(done) {
      var passwordData = {};
      passwordData.password = 'ThisIsFreaky';
      passwordData.newPassword = 'SomethingValid';
      request(app)
        .put('/changepassword/' + testUser._id)
        .send(passwordData)
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          db.users.findOne({
            _id: testUser._id
          }, function(err, user) {
            var hash = encryption.hash(user.salt, 'SomethingValid');
            expect(user.hashedPassword).to.equal(hash);
            done();
          });
        });
    });
  });
});
