'use strict';

var express = require('express');
var config = require('./config/config');

var ServerApp = function() {
  var self = this;

  self.setupVariables = function() {
    //  Set the environment variables we need.
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    self.ipaddress = process.env.OPENSHIFT_NODEJS_IP || process.env.IP;
    self.port = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT ||  8080;

    if (typeof self.ipaddress === "undefined") {
      //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
      //  allows us to run/test the app locally.
      console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
      self.ipaddress = "127.0.0.1";
    }
  };


  /**
   *  terminator === the termination handler
   *  Terminate src on receipt of the specified signal.
   *  @param {string} sig  Signal to terminate on.
   */
  self.terminator = function(sig) {
    if (typeof sig === "string") {
      console.log('%s: Received %s - terminating the app ...',
        Date(Date.now()), sig);
      process.exit(1);
    }
    console.log('%s: Node src stopped.', Date(Date.now()));
  };


  /**
   *  Setup termination handlers (for exit and a list of signals).
   */
  self.setupTerminationHandlers = function() {
    //  Process on exit and signals.
    process.on('exit', function() {
      self.terminator();
    });

    // Removed 'SIGPIPE' from the list - bugz 852598.
    ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
      'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
    ].forEach(function(element) {
      process.on(element, function() {
        self.terminator(element);
      });
    });
  };


  /*  ================================================================  */
  /*  App src functions (main app logic here).                       */
  /*  ================================================================  */
  self.initializeServer = function() {
    self.app = express();

    require('./config/express')(self.app);
    require('./config/routes')(self.app);
  };

  self.initialize = function() {
    self.setupVariables();
    self.setupTerminationHandlers();

    require('./config/passport')();
    require('./config/initialData')();

    self.initializeServer();
  };


  self.start = function() {
    //  Start the app on the specific interface (and port).
    self.app.listen(self.port, self.ipaddress, function() {
      console.log('%s: Node src started on %s:%d ...',
        Date(Date.now()), self.ipaddress, self.port);
    });
  };

};

module.exports = ServerApp;