'use strict';

module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Code Quality Checks
    jshint: {
      options: {
        strict: true,
        jshintrc: true
      },
      uses_defaults: ['src/**/*.js', '!src/**/*.spec.js', 'Gruntfile.js'],
      with_overrides: {
        options: {
          jshintrc: '.jshintrc.spec'
        },
        files: {
          src: ['src/**/*.spec.js']
        }
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
        reporter: 'spec',
        timeout: 5000
      },
      src: ['src/**/*.spec.js']
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
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');

  // Tasks
  grunt.registerTask('default', ['mochaTest', 'jshint', 'jscs']);
  grunt.registerTask('dev', ['default', 'watch']);
};
