'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../../src/config/database');
var ObjectId = require('mongojs').ObjectId;

describe('entities routes', function() {
  var app;
  var authStub = {
    requiresApiLogin: function(req, res, next) {
      requiresApiLoginCalled = true;
      next();
    }
  };
  var myFavoriteEntity;
  var requiresApiLoginCalled;

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
    proxyquire('../../src/repositories/entities', {
      '../services/authentication': authStub
    })(app);
  });

  afterEach(function(done) {
    removeData(done);
  });

  describe('GET', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/entities')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns all of the entities', function(done) {
      request(app)
        .get('/entities')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(6);
          done();
        });
    });

    it('returns just the specified entities', function(done) {
      request(app)
        .get('/entities?entityType=household')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(3);
          done();
        });
    });
  });

  describe('POST', function() {
    it('requires an API login call', function(done) {
      request(app)
        .post('/entities')
        .send({
          name: 'Some Entity',
          entityType: 'somethingIMadeUp'
        })
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('saves new entities', function(done) {
      request(app)
        .post('/entities')
        .send({
          name: 'VW Bug',
          year: 1960,
          vin: '199495903-32',
          entityType: 'vehicle'
        })
        .end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.equal(201);
          db.entities.find({}, function(err, ents) {
            expect(ents.length).to.equal(7);
            done();
          });
        });
    });

    it('does not add entities when updating and existing one', function(done) {
      request(app)
        .post('/entities/' + myFavoriteEntity._id)
        .send({
          name: 'vW Bug',
          year: 1960,
          vin: '199495903-32',
          entityType: 'vehicle'
        })
        .end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.equal(200);
          db.entities.find({}, function(err, ents) {
            expect(ents.length).to.equal(6);
            done();
          });
        });
    });

    it('updates the specified entity', function(done) {
      request(app)
        .post('/entities/' + myFavoriteEntity._id)
        .send({
          name: 'VW Bug',
          year: 1960,
          vin: '199495903-32',
          entityType: 'vehicle'
        })
        .end(function() {
          db.entities.findOne({
            _id: new ObjectId(myFavoriteEntity._id)
          }, function(err, ent) {
            expect(ent.name).to.equal('VW Bug');
            expect(ent.year).to.equal(1960);
            expect(ent.vin).to.equal('199495903-32');
            expect(ent.entityType).to.equal('vehicle');
            done();
          });
        });
    });

    it('returns a 404 error status if the entity does not exist', function(done) {
      request(app)
        .post('/entities/54133902bc88a8241ac17f9d')
        .send({
          name: 'vW Bug',
          year: 1960,
          vin: '199495903-32',
          entityType: 'vehicle'
        })
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });
  });

  describe('vaildation', function() {
    describe('household', function() {
      var entity;
      beforeEach(function() {
        entity = {
          name: 'My Love Shack',
          addressLine1: '42395 Secret St.',
          city: 'Milwaukee',
          state: 'WI',
          postal: '55395',
          phone: '(414) 995-9875',
          entityType: 'household'
        };
      });

      it('requires a name', function(done) {
        entity.name = undefined;
        request(app)
          .post('/entities')
          .send(entity)
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: Name is required');
            done();
          });
      });

      it('requires an address (line 1)', function(done) {
        entity.addressLine1 = undefined;
        request(app)
          .post('/entities')
          .send(entity)
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: Address line 1 is required');
            done();
          });
      });

      it('requires city', function(done) {
        entity.city = undefined;
        request(app)
          .post('/entities')
          .send(entity)
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: City is required');
            done();
          });
      });

      it('requires state', function(done) {
        entity.state = undefined;
        request(app)
          .post('/entities')
          .send(entity)
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: State is required');
            done();
          });
      });

      it('requires postal code', function(done) {
        entity.postal = undefined;
        request(app)
          .post('/entities')
          .send(entity)
          .end(function(err, res) {
            expect(res.status).to.equal(400);
            expect(res.body.reason).to.equal('Error: Postal code is required');
            done();
          });
      });
    });
  });

  function loadData(done) {
    db.entities.remove(function() {
      db.entities.insert([{
        name: 'Old House',
        addressLine1: '805 South Harrison St.',
        city: 'Lancaster',
        state: 'WI',
        postal: '53813',
        phone: '(608) 723-8849',
        entityType: 'household'
      }, {
        name: 'Scion Xb',
        year: 2010,
        vin: '1885940059-293',
        entityType: 'vehicle'
      }, {
        name: 'Kia Rio',
        year: 2008,
        vin: '19948803-385',
        entityType: 'vehicle'
      }, {
        name: 'Refridgerator',
        manufacturer: 'Samsung',
        purchasePrice: 1994.49,
        entityType: 'appliance'
      }, {
        name: 'Newer House',
        addressLine1: '1432 Freaky Dr.',
        city: 'Watertown',
        state: 'WI',
        postal: '53094',
        phone: '(920) 206-1234',
        entityType: 'household'
      }, {
        name: 'Condo Life',
        addressLine1: '1250 Wedgewood Dr.',
        addressLine2: 'Unit #T',
        city: 'Waukesha',
        state: 'WI',
        postal: '53186',
        phone: '(262) 547-2026',
        entityType: 'household'
      }], function() {
        db.entities.findOne({
          name: 'Condo Life'
        }, function(err, e) {
          myFavoriteEntity = e;
          done();
        });
      });
    });
  }

  function removeData(done) {
    db.entities.remove(function() {
      done();
    });
  }
});