var gulp = require('gulp');
var jshint = require('gulp-jshint');

gulp.task('deleteLintLog', function(done) {
  var del = require('del');
  del(['jshint-output.log']).then(function() {
    done();
  });
});

gulp.task('lint', ['lint-src', 'lint-spec']);

gulp.task('lint-src', ['deleteLintLog'], function() {
  return gulp
    .src(__dirname + '/**/!(*.spec).js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('gulp-jshint-file-reporter'));
});

gulp.task('lint-spec', ['deleteLintLog'], function() {
  var jshintOverrides = {
    expr: true,
    predef: ['afterEach', 'beforeEach', 'describe', 'it']
  };

  return gulp
    .src(__dirname + '/**/*.spec.js')
    .pipe(jshint(jshintOverrides))
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('gulp-jshint-file-reporter'));
});

gulp.task('style', function() {
  var jscs = require('gulp-jscs');
  return gulp
    .src(__dirname + '/**/*.js')
    .pipe(jscs())
    .pipe(jscs.reporter())
    .pipe(jscs.reporter('fail'));
});

gulp.task('test', function() {
  var mocha = require('gulp-mocha');
  return gulp
    .src(__dirname + '/**/*.spec.js')
    .pipe(mocha({ reporter: 'nyan' }));
});

gulp.task('default', ['lint', 'style', 'test']);

gulp.task('dev', ['default'], function() {
  return gulp.watch(__dirname + '/**/*.js', ['default']);
});
