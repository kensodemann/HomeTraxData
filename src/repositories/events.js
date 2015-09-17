'use strict';

var authentication = require('../services/authentication');
var _ = require('underscore');
var eventTypes = require('./eventTypes');
var db = require('../config/database');
var ObjectId = require('mongojs').ObjectId;
var redirect = require('../services/redirect');
var RepositoryBase = require('./RepositoryBase');
var util = require('util');

function Events() {
  RepositoryBase.call(this);
  this.collection = db.events;
}

util.inherits(Events, RepositoryBase);

Events.prototype.get = function(req, res) {
  this.criteria = {
    $or: [{
      userId: new ObjectId(req.user._id)
    }, {
      private: false
    }, {
      private: null
    }]
  };
  return RepositoryBase.prototype.get.call(this, req, res);
};

Events.prototype.preSaveAction = function(req, done) {
  req.body.userId = new ObjectId(req.user._id);
  removeBackupProperties(req);
  makeTypesConsistent(req);
  done(null);
};

function removeBackupProperties(req) {
  for (var p in req.body) {
    if (req.body.hasOwnProperty(p)) {
      if (p.match(/^_.*/) && p !== '_id') {
        delete req.body[p];
      }
    }
  }
}

function makeTypesConsistent(req) {
  if (!!req.body.accountRid) {
    req.body.acountRid = new ObjectId(req.body.accountRid);
  }

  if (!!req.body.principalAmount) {
    req.body.principalAmount = Number(req.body.principalAmount);
  }

  if (!!req.body.interestAmount) {
    req.body.interestAmount = Number(req.body.interestAmount);
  }
}

Events.prototype.preCheckStatus = function(req, done) {
  var my = this;

  if (!req.params || !req.params.id) {
    done(null, 200);
  }
  else {
    var criteria = _.extend({}, my.criteria);
    criteria._id = new ObjectId(req.params.id);
    my.collection.findOne(criteria, function(err, item) {
      var status = 404;
      if (!!item) {
        status = item.userId.toString() !== req.user._id.toString() ? 403 : 200;
      }

      done(err, status);
    });
  }
};

Events.prototype.validate = function(req, done) {
  if (!req.body) {
    return done(null, new Error('Request is empty.'));
  }

  if (req.body.eventType === eventTypes.transaction) {
    validateTransactionEvent(req, done);
  } else {
    validateMiscellaneousEvent(req, done);
  }
};

function validateTransactionEvent(req, done) {
  if (!req.body.description) {
    return done(null, new Error('Transactions must have a description.'));
  }

  if (!req.body.transactionDate) {
    return done(null, new Error('Transactions must have a transaction date.'));
  }

  done(null, null);
}

function validateMiscellaneousEvent(req, done) {
  if (!req.body.title) {
    return done(null, new Error('Events must have a title.'));
  }

  if (!req.body.category) {
    return done(null, new Error('Events must have a category.'));
  }

  if (!req.body.start) {
    return done(null, new Error('Events must have a start date.'));
  }

  if (req.body.end && req.body.end < req.body.start) {
    return done(null, new Error('Start date must be on or before the end date.'));
  }

  done(null, null);
}

var repository = new Events();

module.exports = function(app) {
  app.get('/events', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {repository.get(req, res);});

  app.post('/events/:id?', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {repository.save(req, res);});

  app.delete('/events/:id', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {repository.remove(req, res);});
};
