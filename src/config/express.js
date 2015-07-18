'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var passport = require('passport');

module.exports = function(app) {
  app.use(morgan('dev'));
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());

  app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    next();
  });

  app.use(passport.initialize());
};