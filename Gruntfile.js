'use strict';

module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Housekeeping
    clean: ['public/dist', './public/style/*.css*'],

    // Code Quality Checks
    jshint: {
      options: {
        strict: true,
        jshintrc: true
      },
      server: {
        src: ['src/**/*.js', 'test/**/*.js', 'Gruntfile.js']
      }
    },

    jscs: {
      src: '**/*.js',
      options: {
        config: true
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
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');

  // Tasks
  grunt.registerTask('default', ['clean', 'mochaTest', 'jshint', 'jscs']);
  grunt.registerTask('dev', ['default', 'watch']);
};
