// imports
import gulp from 'gulp';
import autoprefixer from 'autoprefixer';
import precss from 'precss';
import postscss from 'postcss-scss';
import postcssCalc from 'postcss-calc';
import stripInlineComments from 'postcss-strip-inline-comments';
import cssMqpacker from 'css-mqpacker';
import postcssFlexbugsFixes from 'postcss-flexbugs-fixes';
import postcssReporter from 'postcss-reporter';
import cssnano from 'cssnano';
import pngquant from 'imagemin-pngquant';
import del from 'del';
import buffer from 'vinyl-buffer';
import runSequence from 'run-sequence';
import browserSync from 'browser-sync';
import gulpLoadPlugins from 'gulp-load-plugins';
import Fontmin from 'fontmin';
import stylelint from 'stylelint';
import webpack from 'webpack-stream';
import friendlyFormatter from 'eslint-friendly-formatter';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

// Paths
const dist = './dist';
const src = './src';

// Linters
gulp.task('lint-styles', () => {
  gulp.src(src + '/postcss/**/*.css')
    .pipe($.postcss([
      stylelint,
      postcssReporter({ clearReportedMessages: true })
    ], {syntax: postscss}));
});
gulp.task('lint-scripts', () => {
  return gulp.src(src + '/js/**/*.js')
  .pipe($.eslint())
  .pipe($.eslint.format(friendlyFormatter));
});

// Optimize images
gulp.task('images', () => {
  // separate images
  gulp.src(src + '/img/**/*.*')
    .pipe(gulp.dest(dist + '/img'));

  // sprites
  let spriteData = gulp.src(src + '/img/src/sprite/*.*')
    .pipe($.spritesmith({
      imgName: 'sprite.png',
      cssName: '_sprite.css',
      imgPath: dist + '/img/sprite.png'
    }));
  spriteData.img
    .pipe(buffer())
    .pipe(gulp.dest(dist + '/img'));
  spriteData.css
    .pipe(gulp.dest(src + '/css'));
});

gulp.task('images-prod', () => {
  // separate images
  gulp.src(src + '/img/**/*.*')
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [
        {removeViewBox: false},
        {cleanupIDs: false}
      ],
      use: [pngquant()]
    })))
    .pipe(gulp.dest(dist + '/img'));

  // sprites
  let spriteData = gulp.src(src + '/img/src/sprite/*.*')
    .pipe($.spritesmith({
      imgName: 'sprite.png',
      cssName: '_sprite.scss',
      imgPath: dist + '/img/sprite.png'
    }));
  spriteData.img
    .pipe(buffer())
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [
        {removeViewBox: false},
        {cleanupIDs: false}
      ],
      use: [pngquant()]
    })))
    .pipe(gulp.dest(dist + '/img'));
  spriteData.css
    .pipe(gulp.dest(src + '/css'));
});

// Copy all files at the root level (src)
gulp.task('copy', () => {
  // 1st level files
  gulp.src(
    [
      src + '/*',
      '!' + src + '/postcss'
    ],
    {
      dot: true
    }
  ).pipe(gulp.dest(dist))
    .pipe($.size({title: 'copy'}));

  // fonts
  gulp.src([
    src + '/fonts/**/*.*',
  ], {
    dot: true
  }).pipe(gulp.dest(dist + '/fonts'));
});

// Fonts
gulp.task('fonts', () => {
  let fontmin = new Fontmin()
    .src(src + '/fonts/**/*.*')
    .use(Fontmin.otf2ttf())
    .use(Fontmin.ttf2woff())
    .dest(dist + '/fonts');

  fontmin.run(function (err, files) {
    if (err) {
      throw err;
    }

    gulp.src(dist + '/fonts/**/*.ttf')
      .pipe($.ttf2woff2())
      .pipe(gulp.dest(dist + '/fonts'));
  });
});

// Styles
const supportedBrowsers = [
  '> 0.5%',
  'last 2 versions',
  'ie >= 9',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.1',
  'bb >= 10'
];

const postcssProcessors = [
  precss,
  stripInlineComments,
  postcssCalc,
  postcssFlexbugsFixes,
  autoprefixer({
    browsers: supportedBrowsers,
    cascade: false
  }),
  cssMqpacker({ sort: true }),
  cssnano({
    autoprefixer: false,
    calc: true,
    colormin: true,
    convertValues: true,
    core: true,
    discardComments: false,
    discardDuplicates: true,
    discardEmpty: true,
    discardOverridden: true,
    discardUnused: true,
    filterOptimiser: true,
    functionOptimiser: true,
    mergeIdents: true,
    mergeLonghand: true,
    mergeRules: true,
    minifyFontValues: true,
    minifyGradients: true,
    minifyParams: true,
    minifySelectors: true,
    normalizeCharset: true,
    normalizeUrl: true,
    orderedValues: true,
    reduceBackgroundRepeat: true,
    reduceIdents: true,
    reduceInitial: true,
    reducePositions: true,
    reduceTimingFunctions: true,
    reduceTransforms: true,
    uniqueSelectors: true,
    zindex: false
  })
];

gulp.task('styles', ['lint-styles'], () => {
  gulp.src(src + '/postcss/*.css')
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.postcss(postcssProcessors, {syntax: postscss}))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(dist + '/css'));
});

gulp.task('styles-prod', ['lint-styles'], () => {
  gulp.src(src + '/postcss/*.css')
    .pipe($.plumber())
    .pipe($.postcss(postcssProcessors, {syntax: postscss}))
    .pipe(gulp.dest(dist + '/css'));
});

// Scripts
const webpackConfig = {
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /node_modules/,
      query: {
        presets: ['es2015', 'es2016']
      }
    }]
  },
  entry: {
    main: __dirname + '/src/js/main.js',
  },
  output: {
    path: __dirname + dist + "/js",
    filename: "[name].js"
  }
};

gulp.task('scripts', ['lint-scripts'], () => {
  gulp.src(src + '/js/*.js')
    .pipe($.sourcemaps.init())
    .pipe(webpack(webpackConfig))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(dist + '/js'));
});

gulp.task('scripts-prod', ['lint-scripts'], () => {
  gulp.src(src + '/js/*.js')
    .pipe(webpack(webpackConfig))
    .pipe($.uglify())
    .pipe(gulp.dest(dist + '/js'))
});

// Clean output directory
gulp.task('clean', () => del([dist], {dot: true}));

// Build dev files
gulp.task('default', ['clean'], cb => {
  runSequence(
    ['styles', 'scripts', 'images', 'copy'],
    cb
  );
});

// Build production files
gulp.task('prod', ['clean'], cb => {
  runSequence(
    ['styles-prod', 'scripts-prod', 'images-prod', 'copy'],
    cb
  );
});

// Watch
gulp.task('watch', ['default'], () => {
  gulp.watch([src + '/postcss/**/*.css'], ['styles', reload]);
  gulp.watch([src + '/js/**/*.js'], ['scripts', reload]);
  gulp.watch([src + '/img/**/*'], ['img', reload]);
});

// Build and serve the output from the dist build
gulp.task('serve', ['default'], () => {
  browserSync({
    notify: false,
    server: dist
  });

  gulp.watch([src + '/postcss/**/*.css'], ['styles', reload]);
  gulp.watch([src + '/js/**/*.js'], ['scripts', reload]);
});