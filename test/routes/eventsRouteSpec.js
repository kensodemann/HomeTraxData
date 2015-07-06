'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../../src/config/database');
var ObjectId = require("mongojs").ObjectId;

describe('events Routes', function() {
  var app;
  var myPublicEvent;
  var myPrivateEvent;
  var otherUserPublicEvent;
  var otherUserPrivateEvent;

  var requiresApiLoginCalled;
  var authStub = {
    requiresApiLogin: function(req, res, next) {
      req.user = {
        _id: '53a4dd887c6dc30000bee3af'
      };
      requiresApiLoginCalled = true;
      next();
    }
  };

  beforeEach(function() {
    app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
  });

  beforeEach(function(done) {
    loadData(done);
  });

  beforeEach(function() {
    requiresApiLoginCalled = false;
    proxyquire('../../src/repositories/events', {
      '../services/authentication': authStub
    })(app);
  });


  afterEach(function(done) {
    removeData(done);
  });

  describe('GET', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/events')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns events for logged in user and non-private events for other users', function(done) {
      request(app)
        .get('/events')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(19);
          res.body.forEach(function(e) {
            if (e.private) {
              expect(e.userId.toString()).to.equal('53a4dd887c6dc30000bee3af');
            }
          });
          done();
        });
    });

    it('can be limited by event type', function(done) {
      request(app)
        .get('/events?eventType=miscellaneous')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(3);
          res.body.forEach(function(e) {
            if (e.private) {
              expect(e.userId.toString()).to.equal('53a4dd887c6dc30000bee3af');
            }
          });
          done();
        });
    });
  });

  describe('POST', function() {
    it('requires an API login', function(done) {
      request(app)
        .post('/events')
        .send({
          title: 'this is a title'
        })
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('Saves new events', function(done) {
      request(app)
        .post('/events')
        .send({
          title: 'This is a new one',
          allDay: true,
          start: '2014-06-22',
          private: true,
          color: 'blue',
          category: 'whatever'
        })
        .end(function(err, res) {
          expect(res.status).to.be.equal(201);
          db.events.find(function(err, events) {
            expect(events.length).to.equal(21);
            done();
          });
        });
    });

    it('Sets userId to logged in user when saving new data', function(done) {
      request(app)
        .post('/events')
        .send({
          title: 'This is a new one',
          allDay: true,
          start: '2014-06-22',
          private: true,
          color: 'blue',
          category: 'whatever'
        })
        .end(function(err, res) {
          expect(res.status).to.be.equal(201);
          db.events.findOne({title: 'This is a new one'}, function(err, evt) {
            expect(evt.userId.toString()).to.equal('53a4dd887c6dc30000bee3af');
            done();
          });
        });
    });

    it('returns the _id when saving new data', function(done) {
      request(app)
        .post('/events')
        .send({
          title: 'This is a new one',
          allDay: true,
          start: '2014-06-22',
          private: true,
          color: 'blue',
          category: 'whatever'
        })
        .end(function(err, res) {
          expect(res.status).to.be.equal(201);
          expect(res.body._id).to.not.be.undefined;
          done();
        });
    });

    it('strips fields starting with _ except _id ', function(done) {
      request(app)
        .post('/events')
        .send({
          title: 'This is a new one',
          allDay: true,
          start: '2014-06-22',
          private: true,
          color: 'blue',
          category: 'whatever',
          _category: 'whatever',
          _start: 'something',
          __id: '42'
        })
        .end(function(err, res) {
          expect(res.status).to.be.equal(201);
          expect(res.body._id).to.not.be.undefined;
          expect(res.body.__id).to.be.undefined;
          expect(res.body._category).to.be.undefined;
          expect(res.body._start).to.be.undefined;
          done();
        });
    });

    it('Saves changes to existing items', function(done) {
      request(app)
        .post('/events/' + myPublicEvent._id.toString())
        .send({
          title: 'Do Something Else',
          allDay: false,
          start: '2014-06-20T12:00:00',
          end: '2014-06-20T13:00:00',
          category: 'Health & Fitness',
          private: false,
          userId: new ObjectId('53a4dd887c6dc30000bee3af')
        })
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          db.events.findOne({_id: myPublicEvent._id}, function(err, evt) {
            expect(evt.title).to.equal('Do Something Else');
            db.events.find(function(err, evts) {
              expect(evts.length).to.equal(20);
              done();
            });
          });
        });
    });

    it("does not allow modifications to non existent events", function(done) {
      request(app)
        .post('/events/53a4dd887c6dc30000bee3af')
        .send({
          title: 'Do Something Else',
          allDay: false,
          start: '2014-06-20T12:00:00',
          end: '2014-06-20T13:00:00',
          category: 'Health & Fitness',
          private: false,
          userId: new ObjectId('53a4dd887c6dc30000bee3af')
        })
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          db.events.find(function(err, evts) {
            expect(evts.length).to.equal(20);
            done();
          });
        });
    });


    describe('saving transaction type events', function(){
      it('does not allow saving an event without a description', function(done) {
        request(app)
          .post('/events')
          .send({
            description: '',
            transactionDate: '2014-06-20T13:00:00',
            principalAmount: 1234,
            interestAmount: 0.01,
            eventType: 'transaction'
          })
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: Transactions must have a description.');
            done();
          });
      });

      it('does not allow saving an event without a transaction date', function(done) {
        request(app)
          .post('/events')
          .send({
            description: 'something',
            transactionDate: '',
            principalAmount: 1234,
            interestAmount: 0.01,
            eventType: 'transaction'
          })
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: Transactions must have a transaction date.');
            done();
          });
      });
    });

    describe('saving miscellaneous type events', function() {
      it("Does not allow modifications to other user's events", function(done) {
        request(app)
          .post('/events/' + otherUserPublicEvent._id.toString())
          .send({
            title: 'Do Something Else',
            allDay: false,
            start: '2014-06-20T12:00:00',
            end: '2014-06-20T13:00:00',
            category: 'Health & Fitness',
            private: false,
            eventType: 'miscellaneous',
            userId: new ObjectId('53a4dd887c6dc30000bee3af')
          })
          .end(function(err, res) {
            expect(res.status).to.equal(403);
            db.events.findOne({_id: otherUserPublicEvent._id}, function(err, evt) {
              expect(evt.title).to.equal('Have Sex');
              db.events.find(function(err, evts) {
                expect(evts.length).to.equal(20);
                done();
              });
            });
          });
      });

      it('does not allow the start date to be greater than the end date', function(done) {
        request(app)
          .post('/events/' + myPublicEvent._id.toString())
          .send({
            title: 'Do Something Else',
            allDay: false,
            start: '2014-06-20T12:00:00',
            end: '2014-06-20T11:00:00',
            category: 'Health & Fitness',
            private: false,
            eventType: 'miscellaneous',
            userId: new ObjectId('53a4dd887c6dc30000bee3af')
          })
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: Start date must be on or before the end date.');
            done();
          });
      });

      it('does not allow the start date to be greater than the end date', function(done) {
        request(app)
          .post('/events')
          .send({
            title: '',
            allDay: false,
            start: '2014-06-20T12:00:00',
            end: '2014-06-20T13:00:00',
            category: 'Health & Fitness',
            eventType: 'miscellaneous',
            private: false
          })
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: Events must have a title.');
            done();
          });
      });

      it('does not allow saving an event without a start date', function(done) {
        request(app)
          .post('/events')
          .send({
            title: 'Do Something Else',
            allDay: false,
            start: '',
            end: '2014-06-20T13:00:00',
            category: 'Health & Fitness',
            eventType: 'miscellaneous',
            private: false
          })
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: Events must have a start date.');
            done();
          });
      });

      it('does not allow saving an event without a category', function(done) {
        request(app)
          .post('/events')
          .send({
            title: 'Do Something Else',
            allDay: false,
            start: '2014-06-20T12:00:00',
            end: '2014-06-20T13:00:00',
            category: '',
            eventType: 'miscellaneous',
            private: false
          })
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: Events must have a category.');
            done();
          });
      });
    });
  });

  describe('DELETE', function() {
    it('requires an API login', function(done) {
      request(app)
        .delete('/events/123456789012345678901234')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('removes the specified item', function(done) {
      request(app)
        .delete('/events/' + myPrivateEvent._id.toString())
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          db.events.find(function(err, evts) {
            expect(evts.length).to.equal(19);
            db.events.findOne({_id: myPrivateEvent._id}, function(err, evt) {
              expect(!!evt).to.be.false;
              done();
            });
          });
        });
    });

    it('retuns 404 if item does not exist', function(done) {
      request(app)
        .delete('/events/53a4dd887c6dc30000bee3af')
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          db.events.find(function(err, evts) {
            expect(evts.length).to.equal(20);
            done();
          });
        });
    });

    describe('deleting miscellaneous events', function() {
      it('returns 403 if item belongs to someone else', function(done) {
        request(app)
          .delete('/events/' + otherUserPublicEvent._id.toString())
          .end(function(err, res) {
            expect(res.status).to.equal(403);
            db.events.find(function(err, evts) {
              expect(evts.length).to.equal(20);
              done();
            });
          });
      });
    });
  });

  function loadData(done) {
    db.events.remove({}, function() {
      db.events.insert([{
        title: 'Eat Something',
        allDay: false,
        start: '2014-06-20T12:00:00',
        end: '2014-06-20T13:00:00',
        category: 'Health & Fitness',
        private: false,
        userId: new ObjectId('53a4dd887c6dc30000bee3af'),
        eventType: 'miscellaneous'
      }, {
        title: 'Fart',
        allDay: false,
        start: '2014-06-20T13:01:00',
        end: '2014-06-20T13:05:00',
        category: 'Health & Fitness',
        private: true,
        userId: new ObjectId('53a4dd887c6dc30000bee3af'),
        eventType: 'miscellaneous'
      }, {
        title: 'Have Sex',
        allDay: false,
        start: '2014-06-22T16:00:00',
        end: '2014-06-22T18:45:00',
        category: 'Recreation',
        userId: new ObjectId('53a4dd887c6dc30000bee3ae'),
        eventType: 'miscellaneous'
      }, {
        title: 'Sleep',
        allDay: false,
        start: '2014-06-23T12:00:00',
        end: '2014-06-20T13:00:00',
        category: 'Health & Fitness',
        private: true,
        userId: new ObjectId('53a4dd887c6dc30000bee3ae'),
        eventType: 'miscellaneous'
      }, {
        name: '1st Mortgage, Trans #1',
        principalAmount: -943.93,
        interestAmount: -394.82,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55081')
      }, {
        name: '1st Mortgage, Trans #2',
        principalAmount: -944.90,
        interestAmount: -393.95,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55081')
      }, {
        name: '1st Mortgage, Trans #3',
        principalAmount: -945.62,
        interestAmount: -393.13,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55081')
      }, {
        name: '2nd Mortgage, Trans #1',
        principalAmount: -199.25,
        interestAmount: -101.25,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55082')
      }, {
        name: '2nd Mortgage, Trans #2',
        principalAmount: -198.65,
        interestAmount: -101.85,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55082')
      }, {
        name: '2nd Mortgage, non-Trans #A',
        principalAmount: -199.25,
        interestAmount: -101.25,
        eventType: 'NotATransaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55082')
      }, {
        name: 'Savings Monthly Deposit #1',
        principalAmount: 1000.00,
        interestAmount: 0.12,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55083')
      }, {
        name: 'Savings Monthly Deposit #2',
        principalAmount: 1000.00,
        interestAmount: 0.13,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55083')
      }, {
        name: 'Savings - Something else',
        principalAmount: 1000.00,
        interestAmount: 0.13,
        description: 'This is some other sort of event',
        eventType: 'SomethingElse',
        accountRid: new ObjectId('54b2e3cd201ada8417b55083')
      }, {
        name: 'Checking Deposit #1',
        principalAmount: 200.00,
        interestAmount: 0.01,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55084')
      }, {
        name: 'Checking Withdrawl #1',
        principalAmount: -3.50,
        interestAmount: 0.02,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55084')
      }, {
        name: 'Checking Deposit #2',
        principalAmount: 300.00,
        interestAmount: 0.05,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55084')
      }, {
        name: 'Checking Withdrawl #2',
        principalAmount: -42.04,
        interestAmount: 0,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55084')
      }, {
        name: 'Checking Something Else',
        principalAmount: 1000.00,
        interestAmount: 0.13,
        description: 'I am something else',
        eventType: 'WhooopDeeHoo',
        accountRid: new ObjectId('54b2e3cd201ada8417b55084')
      }, {
        name: 'Checking Deposit #3',
        principalAmount: 13.94,
        interestAmount: 0.01,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55084')
      }, {
        name: 'Checking Withdrawl #3',
        principalAmount: -123.04,
        interestAmount: 0,
        eventType: 'transaction',
        accountRid: new ObjectId('54b2e3cd201ada8417b55084')
      }], function(err, events) {
        myPublicEvent = events[0];
        myPrivateEvent = events[1];
        otherUserPublicEvent = events[2];
        otherUserPrivateEvent = events[3];
        done();
      });
    });
  }

  function removeData(done) {
    db.events.remove(function() {
      done();
    });
  }
})
;