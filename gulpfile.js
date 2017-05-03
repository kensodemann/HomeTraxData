var gulp = require('gulp');
var gutil = require('gulp-util');
var git = require('gulp-git');
var jshint = require('gulp-jshint');

// Development Tasks
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
    .src(__dirname + '/src/**/*.spec.js')
    .pipe(mocha({ reporter: 'nyan' }));
});

// Release Tasks
gulp.task('checkReleaseParams', function() {
  if (!gutil.env.type) {
    console.error('You must specify a type of release [major, minor, patch]');
    process.exit(1);
  }

  if ((gutil.env.type !== 'major' && gutil.env.type !== 'minor' && gutil.env.type !== 'patch')) {
    console.error('release type must be "major", "minor", or "patch"');
    process.exit(1);
  }
});

var nextVersion;
gulp.task('generateNextVersion', ['checkReleaseParams'], function() {
  var fs = require('fs');
  var semver = require('semver');
  var pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  nextVersion = semver.inc(pkg.version, gutil.env.type);
  console.log(nextVersion);
});

gulp.task('bumpVersion', ['generateNextVersion'], function() {
  var bump = require('gulp-bump');
  return gulp.src('./package.json')
    .pipe(bump({ version: nextVersion }))
    .pipe(gulp.dest('./'));
});

gulp.task('generateChangelog', ['bumpVersion'], function() {
  var conventionalChangelog = require('gulp-conventional-changelog');
  return gulp.src('CHANGELOG.md')
    .pipe(conventionalChangelog({
      preset: 'angular'
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('commitRelease', ['generateChangelog'], function() {
  return gulp.src(['./CHANGELOG.md', './package.json'])
    .pipe(git.add())
    .pipe(git.commit('chore: release version ' + nextVersion));
});

gulp.task('tagRelease', ['commitRelease'], function() {
  git.tag(nextVersion, '', function(err) {
    if (err) throw err;
  });
});

// End user tasks
gulp.task('default', ['lint', 'style', 'test']);

gulp.task('dev', ['default'], function() {
  return gulp.watch(__dirname + '/**/*.js', ['default']);
});

gulp.task('release', ['tagRelease']);
