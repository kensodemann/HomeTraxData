#!/bin/env node
var ServerApp = require('./src/serverApp');

var zapp = new ServerApp();
zapp.initialize();
zapp.start();