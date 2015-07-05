'use strict';

var _ = require('underscore');
var authentication = require('../services/authentication');
var balanceTypes = require('./balanceTypes');
var db = require('../config/database');
var ObjectId = require('mongojs').ObjectId;
var redirect = require('../services/redirect');
var RepositoryBase = require('./RepositoryBase');
var util = require('util');

function Accounts() {
  RepositoryBase.call(this);
  this.collection = db.accounts;
  this.criteria = {};
}

util.inherits(Accounts, RepositoryBase);

Accounts.prototype.preSaveAction = function(req, done) {
  makeTypesConsistent(req);
  done(null);
};

function makeTypesConsistent(req) {
  if (!!req.body.entityRid) {
    req.body.entityRid = new ObjectId(req.body.entityRid);
  }
  if (!!req.body.amount) {
    req.body.amount = Number(req.body.amount);
  }
}

Accounts.prototype.preRemoveAction = function(req, done) {
  db.events.remove({accountRid: new ObjectId(req.params.id)}, done);
};

Accounts.prototype.validate = function(req, done) {
  done(null, null);
};

Accounts.prototype.postGetAction = function(accts, done) {
  db.events.aggregate([{
    $match: {eventType: 'transaction'}
  }, {
    $group: {
      _id: "$accountRid",
      numberOfTransactions: {$sum: 1},
      principalPaid: {$sum: "$principalAmount"},
      interestPaid: {$sum: "$interestAmount"}
    }
  }], function(err, e) {
    accts.forEach(function(acct) {
      var ttls = _.find(e, function(item) {
        return item._id.toString() === acct._id.toString();
      });
      if (!!ttls) {
        acct.numberOfTransactions = ttls.numberOfTransactions;
        acct.principalPaid = ttls.principalPaid;
        acct.interestPaid = ttls.interestPaid;
      } else {
        acct.numberOfTransactions = 0;
        acct.principalPaid = 0;
        acct.interestPaid = 0;
      }
      if (acct.balanceType === balanceTypes.liability) {
        acct.balance = acct.amount - acct.principalPaid;
      } else {
        acct.balance = acct.amount + acct.principalPaid;
      }

    });
    done(err, accts);
  });
};

var accounts = new Accounts();

module.exports = function(app) {
  app.get('/api/accounts', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {accounts.get(req, res);});
  app.get('/api/accounts/:id', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {accounts.getOne(req, res);});
  app.post('/api/accounts/:id?', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {accounts.save(req, res);});
  app.delete('/api/accounts/:id', redirect.toHttps, authentication.requiresApiLogin,
    function(req, res) {accounts.remove(req, res);});
};