'use strict';

module.exports.send = function(err, res) {
  res.status(400);
  res.send({
    reason: err.toString()
  });
};