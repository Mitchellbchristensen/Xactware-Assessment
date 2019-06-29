// conf.js

//Simple Conf for testing
//exports.config = {
//    seleniumAddress: 'http://localhost:4444/wd/hub',
//    specs: ['./tests/1spec.js']
//};

//var HTMLReporter = require('protractor-jasmin2-html-reporter');
//var reporter = new HTMLReporter({
//    savePath: 'C:/Users/Mitchell Christensen/Desktop/Protractor', //baseDirectory: 'D: /Protractor/screenshot',
//    fileName: 'Home_Page',
//    takeScreenshotsOnlyOnFailures: true,
//    userCss: 'my-report-styles.css',
//});
//HTMLReport called once tests are finished
exports.config = {
    framework: 'jasmine',
    seleniumAddress: 'http://localhost:4444/wd/hub',
    specs: ['./tests/2spec.js'],
    jasminNodeOpts: {
        showColors: true,
    },
    //onPrepare: function () {
    //    jasmin.getEnv().addReporter(reporter);
    //    //multiCapabilities: [{
    //    //    'browserName': 'firefox'
    //    //}, {
    //    //    'browserName': 'chrome'
    //    chromeOptions: {
    //        args: [
    //            '--start-maximized'
    //        ]
    //    }
    //},
    };