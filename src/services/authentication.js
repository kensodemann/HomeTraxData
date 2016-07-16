'use strict';

var passport = require('passport');
var encryption = require('./encryption');
var jwt = require('jsonwebtoken');
var secret = require('../config/secret');

exports.passwordIsValid = function(user, enteredPassword) {
  var hashedPassword = encryption.hash(user.salt, enteredPassword);
  return user.hashedPassword === hashedPassword;
};

exports.authenticate = function(req, res, next) {
  req.body.username = req.body.username.toLowerCase();
  var auth = passport.authenticate('local', function(err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      res.send({
        success: false
      });
    }

    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }

      var token = generateAuthToken(user);

      res.send({
        success: true,
        user: user,
        token: token
      });
    });
  });

  auth(req, res, next);
};

exports.refreshToken = function(req, res) {
  try {
    generateNewToken();
  } catch (err) {
    res.send({success: false});
  }

  function generateNewToken() {
    var token = getAuthToken(req);
    var user = jwt.verify(token, secret.jwtCertificate);
    token = generateAuthToken(user);
    res.send({
      success: true,
      token: token
    });
  }
};

exports.requiresApiLogin = function(req, res, next) {
  if (userIsNotAuthenticated(req)) {
    res.status(401);
    res.end();
  } else {
    next();
  }
};

exports.requiresRole = function(role) {
  return function(req, res, next) {
    if (userIsNotAuthenticated(req)) {
      res.status(401);
      res.end();
    } else if (userIsNotInRole(req, role)) {
      res.status(403);
      res.end();
    } else {
      next();
    }
  };
};

exports.requiresRoleOrIsCurrentUser = function(role) {
  return function(req, res, next) {
    if (userIsNotAuthenticated(req)) {
      res.status(401);
      res.end();
    } else if (userIsNotInRole(req, role) && req.user._id != req.params.id) {
      res.status(403);
      res.end();
    } else {
      next();
    }
  };
};

function userIsNotAuthenticated(req) {
  var token = getAuthToken(req);
  try {
    req.user = jwt.verify(token, secret.jwtCertificate);
  } catch (err) {
    return true;
  }

  return false;
}

function getAuthToken(req) {
  if (!req.headers.authorization) {
    return undefined;
  }

  return req.headers.authorization.split(' ')[1];
}

function generateAuthToken(user) {
  if (user.iat) {
    delete user.iat;
  }

  if (user.exp) {
    delete user.exp;
  }

  return jwt.sign(user, secret.jwtCertificate, {expiresIn: '10d'});
}

function userIsNotInRole(req, role) {
  return req.user.roles.indexOf(role) === -1;
}
