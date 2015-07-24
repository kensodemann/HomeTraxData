'use strict';

var _ = require('underscore');
var authentication = require('../services/authentication');
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

Accounts.prototype.preSaveAction = function (req, done) {
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

Accounts.prototype.preRemoveAction = function (req, done) {
  db.events.remove({accountRid: new ObjectId(req.params.id)}, done);
};

Accounts.prototype.validate = function (req, done) {
  done(null, null);
};

Accounts.prototype.postGetAction = function (accts, done) {
  db.events.aggregate([{
    $match: {eventType: 'transaction'}
  }, {
    $project: {
      accountRid: "$accountRid",
      principalAmount: {
        $cond: [{$eq: ["$transactionType", "disbursement"]}, 0, "$principalAmount"]
      },
      disbursementAmount: {
        $cond: [
          {$eq: ["$transactionType", "disbursement"]}, "$principalAmount", 0]
      },
      interestAmount: "$interestAmount"
    }
  }, {
    $group: {
      _id: "$accountRid",
      numberOfTransactions: {$sum: 1},
      disbursements: {$sum: "$disbursementAmount"},
      principalPaid: {$sum: "$principalAmount"},
      interestPaid: {$sum: "$interestAmount"}
    }
  }], function (err, e) {
    accts.forEach(function (acct) {
      var ttls = findAccountTotals(e, acct);
      assignTotals(acct, ttls);
    });
    done(err, accts);
  });
};

var accounts = new Accounts();

module.exports = function (app) {
  app.get('/accounts', redirect.toHttps, authentication.requiresApiLogin,
    function (req, res) {
      accounts.get(req, res);
    });
  app.get('/accounts/:id', redirect.toHttps, authentication.requiresApiLogin,
    function (req, res) {
      accounts.getOne(req, res);
    });
  app.post('/accounts/:id?', redirect.toHttps, authentication.requiresApiLogin,
    function (req, res) {
      accounts.save(req, res);
    });
  app.delete('/accounts/:id', redirect.toHttps, authentication.requiresApiLogin,
    function (req, res) {
      accounts.remove(req, res);
    });
};


function findAccountTotals(e, acct) {
  return _.find(e, function (item) {
    return item._id.toString() === acct._id.toString();
  });
}
function assignTotals(acct, ttls) {
  if (!!ttls) {
    acct.numberOfTransactions = ttls.numberOfTransactions;
    acct.principalPaid = ttls.principalPaid;
    acct.interestPaid = ttls.interestPaid;
    acct.disbursements = ttls.disbursements;
  } else {
    acct.numberOfTransactions = 0;
    acct.principalPaid = 0;
    acct.interestPaid = 0;
    acct.disbursements = 0;
  }
}