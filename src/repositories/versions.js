'use strict';

var error = require('../services/error');
var fs = require('fs');
var redirect = require('../services/redirect');

function get(req, res) {
  fs.readFile('./src/data/versions.json', 'utf8', function(err, data) {
    if (err) {
      return error.send(err, res);
    }

    var output = JSON.parse(data);
    res.status(200).json(output);
  });
}

module.exports = function(app){
  app.get('/versions', redirect.toHttps, function(req, res) {get(req, res);});
};
