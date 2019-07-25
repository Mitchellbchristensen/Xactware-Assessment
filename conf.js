// conf.js

//Simple Conf for testing
//exports.config = {
//    seleniumAddress: 'http://localhost:4444/wd/hub',
//    specs: ['./tests/1spec.js']

var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
    framework: 'jasmine',
    seleniumAddress: 'http://localhost:4444/wd/hub',
    suites: {
        homepage: './tests/1spec.js',
        loginpage: './tests/2spec.js',
        experiment: './tests/experiment.js'
    },
    multiCapabilities: [{
        browserName: 'chrome',
        sharedTestFiles: true,
        maxInstances: 1,
        chromeOptions: {
            args: [
                '--start-maximized']
        }
    }, {
        browserName: 'firefox',
        'moz:firefoxOptions': {
            args: [
                '--safe-mode']
            }
        }],
    maxSessions: 2,
    onPrepare: function () {
        // Adds a screenshot reporter html link to /tmp/screenshots`:
        jasmine.getEnv().addReporter(new HtmlReporter({
            baseDirectory: 'tmp/screenshots'
        }).getJasmine2Reporter());
        new HtmlReporter({
            baseDirectory: 'tmp/screenshots'
            , screenshotsSubfolder: 'images'
        });
        new HtmlReporter({
            baseDirectory: 'tmp/screenshots'
            , jsonsSubfolder: 'jsons'
        });
    },
    params: {
        login: {
            user: 'MitchellC',
            password: 'Timp1234'
        }
    },
    jasmineNodeOpts: {
        showColors: true,
        defaultTimoutInterval: 30000
    },
};
