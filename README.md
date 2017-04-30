# Time Trax Data

We have two time tracking systems at work. It sucks, but that's life. The time-trax application
allows me to keep track of my time so I can enter it into the systems. It is very special
purpose for my needs.

It also gives me a chance to learn technologies we don't use at work, so bonus.

## Quick Start

Besides the basics ([Git](http://git-scm.com/), [Node](http://nodejs.org/), and [MongoDB](https://www.mongodb.org/)), you will need to install a few
tools in order to do any real work.

  - npm install bower -g
  - npm install karma-cli -g
  - npm install grunt-cli -g
  - npm install phantomjs -g
  - npm install mocha -g

## Summary of grunt commands

Here are the most useful grunt tasks. For a list of the other ones, see the Gruntfile.js

  - grunt - this does a dev build
  - grunt build - production build, use this to test before deployment
  - grunt dev - dev build, waits for changes and re-runs on change, use this during development
  - grunt karma - just run the front end tests

Assuming all tests are currently passing, run "grunt dev" before starting any development work,
and it will automatically test and build as you work.

## Deployment

I have this project deployed on [OpenShift](https://www.openshift.com/). Given that I am
not completely stupid, I am not going to give specific instructions here, but to set up a
deployment, do this:

  - Install rhc
  - rhc setup (this should generate keys, etc)
  - git remote add openShift URL-TO-OPENSHIFT-REPO (get URL from OpenShift account)

After that, pushes to master using that report will do the deployment.
