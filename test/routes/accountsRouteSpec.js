'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../../src/config/database');
var ObjectId = require('mongojs').ObjectId;

describe('accounts Routes', function() {
  var app;

  var myCar;
  var myHouse;
  var myCarLoan;
  var myFirstMortgage;
  var mySecondMortgage;
  var myChecking;
  var mySavings;

  var authStub = {
    requiresApiLogin: function(req, res, next) {
      requiresApiLoginCalled = true;
      next();
    }
  };
  var requiresApiLoginCalled;

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
  });

  beforeEach(function() {
    requiresApiLoginCalled = false;
    proxyquire('../../src/repositories/accounts', {
      '../services/authentication': authStub
    })(app);
  });

  beforeEach(function(done) {
    loadData(done);
  });

  afterEach(function(done) {
    removeData(done);
  });

  describe('GET Collection', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/accounts')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns all of the accounts', function(done) {
      request(app)
        .get('/accounts')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(5);
          done();
        });
    });

    describe('liability accounts', function() {
      it('include sums and counts', function(done) {
        request(app)
          .get('/accounts')
          .end(function(err, res) {
            var accounts = res.body;
            var acct = findAccount(accounts, mySecondMortgage);
            expect(acct.principalPaid).to.be.closeTo(397.9, 0.001);
            expect(acct.interestPaid).to.be.closeTo(203.1, 0.001);
            expect(acct.numberOfTransactions).to.equal(2);
            done();
          });
      });

      it('subtracts payments from the amount to get the balance', function(done) {
        request(app)
          .get('/accounts')
          .end(function(err, res) {
            var accounts = res.body;
            var acct = findAccount(accounts, mySecondMortgage);
            expect(acct.balance).to.be.closeTo(acct.amount - 397.9, 0.001);
            done();
          });
      });
    });


    describe('asset accounts', function() {
      it('includes sums and counts for asset auth', function(done) {
        request(app)
          .get('/accounts')
          .end(function(err, res) {
            var accounts = res.body;
            var acct = findAccount(accounts, myChecking);
            expect(acct.principalPaid).to.be.closeTo(345.36, 0.001);
            expect(acct.interestPaid).to.be.closeTo(0.09, 0.001);
            expect(acct.numberOfTransactions).to.equal(6);
            done();
          });
      });

      it('adds net to the amount to get the balance', function(done) {
        request(app)
          .get('/accounts')
          .end(function(err, res) {
            var accounts = res.body;
            var acct = findAccount(accounts, myChecking);
            expect(acct.balance).to.be.closeTo(acct.amount + 345.36, 0.001);
            done();
          });
      });
    });

    function findAccount(accounts, acct) {
      return _.find(accounts, function(a) {
        return a._id === acct._id.toString();
      });
    }
  });

  describe('GET Single', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/accounts/' + myCarLoan._id.toString())
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns the specified auth', function(done) {
      request(app)
        .get('/accounts/' + myCarLoan._id.toString())
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          myCarLoan._id = myCarLoan._id.toString();
          myCarLoan.entityRid = myCarLoan.entityRid.toString();
          expect(res.body).to.deep.equal(myCarLoan);
          done();
        });
    });

    it('returns a 404 status if the auth does not exist', function(done) {
      request(app)
        .get('/accounts/' + myCar._id.toString())
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });
  });

  describe('POST', function() {
    it('requires an API login', function(done) {
      request(app)
        .post('/accounts')
        .send({
          name: 'Another Car Loan',
          bank: 'Car Chase Bank',
          accountNumber: '132499503-43',
          accountType: 'loan',
          balanceType: 'liability',
          amount: 5049.83,
          entityRid: myCar._id
        })
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('saves new accounts', function(done) {
      request(app)
        .post('/accounts')
        .send({
          name: 'Another Car Loan',
          bank: 'Car Chase Bank',
          accountNumber: '132499503-43',
          accountType: 'loan',
          balanceType: 'liability',
          amount: 5049.83,
          entityRid: myCar._id
        })
        .end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.be.equal(201);
          db.accounts.find(function(err, h) {
            expect(h.length).to.equal(6);
            done();
          });
        });
    });

    it('does not add new accounts when updating existing accounts', function(done) {
      request(app)
        .post('/accounts/' + myCarLoan._id)
        .send({
          name: 'Another Car Loan',
          bank: 'Car Chase Bank',
          accountNumber: '132499503-43',
          accountType: 'loan',
          balanceType: 'liability',
          amount: 5049.83,
          entityRid: myCar._id
        })
        .end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.be.equal(200);
          db.accounts.find(function(err, h) {
            expect(h.length).to.equal(5);
            done();
          });
        });
    });

    it('updates the specified household', function(done) {
      request(app)
        .post('/accounts/' + myCarLoan._id)
        .send({
          name: 'Another Car Loan',
          bank: 'Car Chase Bank',
          accountNumber: '132499503-43',
          accountType: 'loan',
          balanceType: 'liability',
          amount: 5049.83,
          entityRid: myCar._id
        })
        .end(function() {
          db.accounts.findOne({
            _id: new ObjectId(myCarLoan._id)
          }, function(err, a) {
            expect(a.name).to.equal('Another Car Loan');
            expect(a.bank).to.equal('Car Chase Bank');
            expect(a.accountNumber).to.equal('132499503-43');
            expect(a.entityRid).to.deep.equal(myCar._id);
            expect(a.amount).to.equal(5049.83);
            done();
          });
        });
    });

    it('returns 404 if the auth does not exist', function(done) {
      request(app)
        .post('/accounts/54133902bc88a8241ac17f9d')
        .send({
          name: 'Another Car Loan',
          bank: 'Car Chase Bank',
          accountNumber: '132499503-43',
          accountType: 'loan',
          balanceType: 'liability',
          amount: 5049.83,
          entityRid: myCar._id
        })
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });
  });

  describe('DELETE', function() {
    it('requires an API login', function(done) {
      request(app)
        .delete('/accounts/' + mySecondMortgage._id.toString())
        .send()
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('removes the specified auth', function(done) {
      request(app)
        .delete('/accounts/' + mySecondMortgage._id.toString())
        .send()
        .end(function() {
          db.accounts.find(function(err, a) {
            expect(a.length).to.equal(4);
            a.forEach(function(item) {
              expect(item._id).to.not.deep.equal(mySecondMortgage._id);
            });
            done();
          });
        });
    });

    it('removes events associated with specified auth', function(done) {
      request(app)
        .delete('/accounts/' + mySecondMortgage._id.toString())
        .send()
        .end(function() {
          db.events.find(function(err, evts) {
            expect(evts.length).to.equal(13);
            evts.forEach(function(item) {
              expect(item.accountRid).to.not.deep.equal(mySecondMortgage._id);
            });
            done();
          });
        });

    });

    it('returns a status of 404 if the specified auth does not exist', function(done) {
      request(app)
        .delete('/accounts/55293bd4b4b789415aa33dcf')
        .send()
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          db.accounts.find(function(err, a) {
            expect(a.length).to.equal(5);
            done();
          });
        });
    });
  });

  function loadData(done) {
    removeData(function() {
      loadEntities(function() {
        loadAccounts(function() {
          loadEvents(function() {
            done();
          });
        });
      });
    });
  }

  function loadEntities(done) {
    db.entities.insert([{
      name: 'My House',
      entityeType: 'household'
    }, {
      name: 'My Car',
      entityType: 'vehicle'
    }], function() {
      db.entities.findOne({name: 'My House'}, function(err, e) {
        myHouse = e;
        db.entities.findOne({name: 'My Car'}, function(err, e) {
          myCar = e;
          done();
        });
      });
    });
  }

  function loadAccounts(done) {
    db.accounts.save({
      name: 'Savings',
      bank: 'Middle Town Savings',
      accountNumber: '99948594-091',
      accountType: 'savings',
      balanceType: 'asset',
      amount: 1000.00
    }, function(err, a) {
      mySavings = a;
      db.accounts.save({
        name: 'Checking',
        bank: 'South Central Park Bank',
        accountNumber: '3994050-395',
        accountType: 'checking',
        balanceType: 'asset',
        amount: 4234.79
      }, function(err, a) {
        myChecking = a;
        db.accounts.save({
          name: 'Mortgage',
          bank: 'Eastern World Bank',
          accountNumber: '1399405-2093',
          accountType: 'loan',
          balanceType: 'liability',
          amount: 176940.43,
          entityRid: myHouse._id
        }, function(err, a) {
          myFirstMortgage = a;
          db.accounts.save({
            name: 'Second Mortgage',
            bank: 'Western State Bank',
            accountNumber: '38984905-39',
            accountType: 'loan',
            balanceType: 'liability',
            amount: 30495.78,
            entityRid: myHouse._id
          }, function(err, a) {
            mySecondMortgage = a;
            db.accounts.save({
              name: 'Car Loan',
              bank: 'Northern City Bank',
              accountNumber: '899348509a-83c',
              accountType: 'loan',
              balanceType: 'liability',
              amount: 13953.00,
              entityRid: myCar._id
            }, function(err, a) {
              myCarLoan = a;
              done();
            });
          });
        });
      });
    });
  }

  function loadEvents(done) {
    db.events.insert([{
      description: '1st Mortgage, Payment #1',
      principalAmount: 943.93,
      interestAmount: 394.82,
      eventType: 'transaction',
      accountRid: myFirstMortgage._id
    }, {
      description: '1st Mortgage, Payment #2',
      principalAmount: 944.90,
      interestAmount: 393.95,
      eventType: 'transaction',
      accountRid: myFirstMortgage._id
    }, {
      name: '1st Mortgage, Payment #3',
      principalAmount: 945.62,
      interestAmount: 393.13,
      eventType: 'transaction',
      accountRid: myFirstMortgage._id
    }, {
      name: '2nd Mortgage, Payment #1',
      principalAmount: 199.25,
      interestAmount: 101.25,
      eventType: 'transaction',
      accountRid: mySecondMortgage._id
    }, {
      name: '2nd Mortgage, Payment #2',
      principalAmount: 198.65,
      interestAmount: 101.85,
      eventType: 'transaction',
      accountRid: mySecondMortgage._id
    }, {
      description: '2nd Mortgage, non-Trans #A',
      principalAmount: 199.25,
      interestAmount: 101.25,
      eventType: 'NotATransaction',
      accountRid: mySecondMortgage._id
    }, {
      description: 'Savings Monthly Deposit #1',
      principalAmount: 1000.00,
      interestAmount: 0.12,
      eventType: 'transaction',
      accountRid: mySavings._id
    }, {
      description: 'Savings Monthly Deposit #2',
      principalAmount: 1000.00,
      interestAmount: 0.13,
      eventType: 'transaction',
      accountRid: mySavings._id
    }, {
      name: 'Savings - Something else',
      principalAmount: 1000.00,
      interestAmount: 0.13,
      description: 'This is some other sort of event',
      eventType: 'SomethingElse',
      accountRid: mySavings._id
    }, {
      description: 'Checking Deposit #1',
      principalAmount: 200.00,
      interestAmount: 0.01,
      eventType: 'transaction',
      accountRid: myChecking._id
    }, {
      description: 'Checking Withdrawl #1',
      principalAmount: -3.50,
      interestAmount: 0.02,
      eventType: 'transaction',
      accountRid: myChecking._id
    }, {
      description: 'Checking Deposit #2',
      principalAmount: 300.00,
      interestAmount: 0.05,
      eventType: 'transaction',
      accountRid: myChecking._id
    }, {
      description: 'Checking Withdrawl #2',
      principalAmount: -42.04,
      interestAmount: 0,
      eventType: 'transaction',
      accountRid: myChecking._id
    }, {
      name: 'Checking Something Else',
      principalAmount: 1000.00,
      interestAmount: 0.13,
      description: 'I am something else',
      eventType: 'WhooopDeeHoo',
      accountRid: myChecking._id
    }, {
      description: 'Checking Deposit #3',
      principalAmount: 13.94,
      interestAmount: 0.01,
      eventType: 'transaction',
      accountRid: myChecking._id
    }, {
      description: 'Checking Withdrawl #3',
      principalAmount: -123.04,
      interestAmount: 0,
      eventType: 'transaction',
      accountRid: myChecking._id
    }], function() {
      done();
    });
  }

  function removeData(done) {
    db.accounts.remove(function() {
      db.events.remove(function() {
        db.entities.remove(function() {
          done();
        });
      });
    });
  }
});
