'use strict';

var _ = require('underscore');
var error = require('../services/error');
var ObjectId = require('mongojs').ObjectId;

function RepositoryBase() {
  this.collection = {};
  this.criteria = {};
}

RepositoryBase.prototype.get = function(req, res) {
  var my = this;
  var criteria = {};

  _.extend(criteria, my.criteria);
  _.extend(criteria, req.query);


  my.collection.find(criteria, function(err, item) {
    if (err) {
      return error.send(err, res);
    }
    my.postGetAction(item, function(err, item) {
      if (err) {
        return error.send(err, res);
      }
      res.send(item);
    });
  });
};

RepositoryBase.prototype.getOne = function(req, res) {
  var criteria = _.extend({}, this.criteria);
  criteria._id = new ObjectId(req.params.id);
  this.collection.findOne(criteria, function(err, item) {
    if (!!err) {
      return error.send(err, res);
    }
    if (!item) {
      res.status(404);
    }
    res.send(item);
  });
};

RepositoryBase.prototype.save = function(req, res) {
  var my = this;

  assignIdFromRequest();
  my.preSaveAction(req, function(err) {
    if (!!err) {
      return error.send(err, res);
    }

    my.validate(req, function(err, msg) {
      if (!!err) {
        return error.send(err, res);
      }
      if (!!msg) {
        return error.send(msg, res);
      }

      my.preCheckStatus(req, function(err, status) {
        if (!!err) {
          return error.send(err, res);
        }
        if (status === 200) {
          performSave();
        } else {
          res.status(status);
          res.end();
        }
      });
    });
  });


  function assignIdFromRequest() {
    if (req.params && req.params.id) {
      req.body._id = new ObjectId(req.params.id);
    } else {
      req.body_id = undefined;
    }
  }

  function performSave() {
    my.collection.save(req.body, function(err, item) {
      if (!!err) {
        return error.send(err, res);
      }
      if (!req.params || !req.params.id) {
        res.status(201);
      }
      res.send(item);
    });
  }
};

RepositoryBase.prototype.remove = function(req, res) {
  var my = this;

  my.preCheckStatus(req, function(err, status) {
    if (!!err) {
      return error.send(err, res);
    }
    if (status === 200) {
      removeItem();
    } else {
      res.status(status);
      res.end();
    }
  });

  function removeItem() {
    my.preRemoveAction(req, function(err) {
      if (!!err) {
        return error.send(err, res);
      }
      my.collection.remove({_id: new ObjectId(req.params.id)}, function(err) {
        if (!!err) {
          return error.send(err, res);
        }
        res.send();
      });
    });
  }
};

RepositoryBase.prototype.preCheckStatus = function(req, done) {
  var my = this;

  if (!req.params || !req.params.id) {
    done(null, 200);
  }
  else {
    var criteria = _.extend({}, my.criteria);
    criteria._id = new ObjectId(req.params.id);
    my.collection.findOne(criteria, function(err, item) {
      done(err, !!item ? 200 : 404);
    });
  }
};

RepositoryBase.prototype.preSaveAction = function(req, done) {
  done(null);
};

RepositoryBase.prototype.preRemoveAction = function(req, done) {
  done(null, null);
};

RepositoryBase.prototype.validate = function(req, done) {
  done(null, null);
};

RepositoryBase.prototype.postGetAction = function(items, done) {
  done(null, items);
};

module.exports = RepositoryBase;