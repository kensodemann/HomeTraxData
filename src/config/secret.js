'use strict';

var fs = require('fs');

module.exports.jwtCertificate = fs.readFileSync('jwtPrivate.key', {encoding: 'utf8'});