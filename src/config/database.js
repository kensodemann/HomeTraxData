'use strict';

var mongojs = require('mongojs');

var collections = [
  'projects',
  'taskTimers',
  'users'
];

function openShiftConnectString() {
  return process.env.OPENSHIFT_MONGODB_DB_USERNAME + ':' +
    process.env.OPENSHIFT_MONGODB_DB_PASSWORD + '@' +
    process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
    process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
    process.env.OPENSHIFT_APP_NAME;
}

function connectString() {
  if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
    return openShiftConnectString(process.env);
  } else if (process.env.NODE_ENV === 'development') {
    return '127.0.0.1:27017/HomeApp';
  } else {
    return '127.0.0.1:27017/HomeAppTest';
  }
}

var cs = connectString();
module.exports = mongojs(cs, collections);
