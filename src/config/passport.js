'use strict';

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var db = require('./database');
var authentication = require('../services/authentication');

module.exports = function() {
  passport.use(new LocalStrategy(
    function(username, password, done) {
      db.users.findOne({
          username: username
        },
        function(err, user) {
          if (user && authentication.passwordIsValid(user, password)) {
            return done(null, {
              _id: user._id,
              username: user.username,
              roles: user.roles,
              colors: user.colors
            });
          }
          else {
            return done(null, false);
          }
        });
    }
  ));

  passport.serializeUser(function(user, done) {
    if (user) {
      done(null, user._id);
    }
  });
};