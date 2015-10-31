'use strict';

var expect = require('chai').expect;
var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var proxyquire = require('proxyquire');
var db = require('../../src/config/database');
var ObjectId = require('mongojs').ObjectId;

describe('projects routes', function() {
  var app;
  var authStub = {
    requiresApiLogin: function(req, res, next) {
      requiresApiLoginCalled = true;
      next();
    }
  };
  var myFavoriteProject;
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
    proxyquire('../../src/repositories/projects', {
      '../services/authentication': authStub
    })(app);
  });

  afterEach(function(done) {
    removeData(done);
  });

  describe('GET collection', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/projects')
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns all of the projects', function(done) {
      request(app)
        .get('/projects')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(6);
          done();
        });
    });

    it('returns just the specified projects', function(done) {
      request(app)
        .get('/projects?status=active')
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          expect(res.body.length).to.equal(4);
          done();
        });
    });
  });

  describe('GET single object', function() {
    it('requires an API login', function(done) {
      request(app)
        .get('/projects/' + myFavoriteProject._id.toString())
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('returns just the specified project', function(done) {
      request(app)
        .get('/projects/' + myFavoriteProject._id.toString())
        .end(function(err, res) {
          expect(res.status).to.equal(200);
          myFavoriteProject._id = myFavoriteProject._id.toString();
          expect(res.body).to.deep.equal(myFavoriteProject);
          done();
        });
    });
  });

  describe('POST', function() {
    it('requires an API login call', function(done) {
      request(app)
        .post('/projects')
        .send({
          name: 'Some Entity',
          entityType: 'somethingIMadeUp'
        })
        .end(function() {
          expect(requiresApiLoginCalled).to.be.true;
          done();
        });
    });

    it('saves the new projct', function(done) {
      request(app)
        .post('/projects')
        .send({
          name: 'Share',
          jiraTaskId: 'AA-201',
          sbvbTaskId: 'IFP104935',
          status: 'active'
        })
        .end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.equal(201);
          db.projects.find({}, function(err, ents) {
            expect(ents.length).to.equal(7);
            done();
          });
        });
    });

    it('does not add entities when updating and existing one', function(done) {
      request(app)
        .post('/projects/' + myFavoriteProject._id)
        .send({
          name: 'Share',
          jiraTaskId: 'AA-201',
          sbvbTaskId: 'IFP104935',
          status: 'active'
        })
        .end(function(err, res) {
          expect(!!err).to.be.false;
          expect(res.status).to.equal(200);
          db.projects.find({}, function(err, ents) {
            expect(ents.length).to.equal(6);
            done();
          });
        });
    });

    it('updates the specified entity', function(done) {
      request(app)
        .post('/projects/' + myFavoriteProject._id)
        .send({
          name: 'Share',
          jiraTaskId: 'AA-201',
          sbvbTaskId: 'IFP104935',
          status: 'active'
        })
        .end(function() {
          db.projects.findOne({
            _id: new ObjectId(myFavoriteProject._id)
          }, function(err, ent) {
            expect(ent.name).to.equal('Share');
            expect(ent.jiraTaskId).to.equal('AA-201');
            expect(ent.sbvbTaskId).to.equal('IFP104935');
            expect(ent.status).to.equal('active');
            done();
          });
        });
    });

    it('returns a 404 error status if the entity does not exist', function(done) {
      request(app)
        .post('/projects/54133902bc88a8241ac17f9d')
        .send({
          name: 'Share',
          jiraTaskId: 'AA-201',
          sbvbTaskId: 'IFP104935',
          status: 'active'
        })
        .end(function(err, res) {
          expect(res.status).to.equal(404);
          done();
        });
    });
  });

  describe('vaildation', function() {
    var project;
    beforeEach(function() {
      project = {
        name: 'Share',
        jiraTaskId: 'AA-201',
        sbvbTaskId: 'IFP104935',
        status: 'active'
      };
    });

    it('requires a name', function(done) {
      project.name = undefined;
      request(app)
        .post('/projects')
        .send(project)
        .end(function(err, res) {
          expect(res.status).to.equal(400);
          expect(res.body.reason).to.equal('Error: Name is required');
          done();
        });
    });

    it('requires a status', function(done) {
      project.status = undefined;
      request(app)
        .post('/projects')
        .send(project)
        .end(function(err, res) {
          expect(res.status).to.equal(400);
          expect(res.body.reason).to.equal('Error: Status is required');
          done();
        });
    });
  });

  function loadData(done) {
    db.projects.remove(function() {
      db.projects.insert([{
        name: 'Create Data Route',
        jiraTaskId: 'WPM-345',
        sbvbTaskId: 'RFP12234',
        status: 'active'
      }, {
        name: 'Initial Login View',
        jiraTaskId: 'WPM-523',
        sbvbTaskId: 'RFP12234',
        status: 'inactive'
      }, {
        name: 'Login Service',
        jiraTaskId: 'WPM-123',
        sbvbTaskId: 'RFP12234',
        status: 'active'
      }, {
        name: 'Execution Service',
        jiraTaskId: 'WPM-666',
        sbvbTaskId: 'RFP12234',
        status: 'inactive'
      }, {
        name: 'Eat Cake',
        jiraTaskId: 'AA-102',
        sbvbTaskId: 'IFP104935',
        status: 'active'
      }, {
        name: 'Drink Coffee',
        jiraTaskId: 'AA-101',
        sbvbTaskId: 'IFP104935',
        status: 'active'
      }], function() {
        db.projects.findOne({
          jiraTaskId: 'AA-102'
        }, function(err, e) {
          myFavoriteProject = e;
          done();
        });
      });
    });
  }

  function removeData(done) {
    db.projects.remove(done);
  }
});
