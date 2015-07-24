'use strict';

module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Housekeeping
    clean: ["public/dist", "./public/style/*.css*"],

    // Code Quality Checks
    jshint: {
      options: {
        strict: true
      },
      server: {
        src: ['src/**/*.js', 'Gruntfile.js'],
        options: {
          node: true
        }
      },
      serverTest: {
        src: ['test/**/*.js'],
        options: {
          expr: true,
          globals: {
            afterEach: true,
            beforeEach: true,
            describe: true,
            it: true
          },
          node: true
        }
      }
    },

    // Tests
    mochaTest: {
      options: {
        reporter: 'min',
        timeout: 5000
      },
      src: ['test/**/*Spec.js']
    },

    // Grunt functional
    watch: {
      src: {
        files: ['Gruntfile.js',
          'server.js',
          'src/**/*.js',
          'test/**/*.js'],
        tasks: ['default']
      }
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');

  // Tasks
  grunt.registerTask('default', ['clean', 'mochaTest', 'jshint']);
  grunt.registerTask('dev', ['default', 'watch']);
};
