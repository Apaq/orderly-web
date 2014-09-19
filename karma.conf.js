module.exports = function(config){
  config.set({

    basePath : './',

    files : [
      'www/lib/js/angular/angular.js',
      'www/lib/js/angular-route/angular-route.js',
      'www/lib/js/angular-mocks/angular-mocks.js',
      'www/lib/js/angular-local-storage/angular-local-storage.js',
      'www/lib/js/angular-resource/angular-resource.js',
      'www/lib/js/angular-ui-calendar/src/calendar.js',
      'www/lib/js/angular-bootstrap/ui-bootstrap.js',
      'www/lib/js/angular-bootstrap/ui-bootstrap-tpls.js',
      'www/lib/js/angular-animate/angular-animate.js',
      'www/lib/js/orderly-angular/src/ng-orderly.js',
      'www/js/*.js',
      'test/**/*.js'
    ],

    autoWatch : true,

    frameworks: ['jasmine'],

    browsers : ['Chrome'],

    plugins : [
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-jasmine',
            'karma-junit-reporter'
            ],

    junitReporter : {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    }

  });
};
