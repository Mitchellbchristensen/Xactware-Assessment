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
        fad: './tests/2spec.js',
        experiment: './tests/experiment.js'
    },
    baseUrl: 'https://healthcare.utah.edu/',
    //multiCapabilities: [{
    //    browserName: 'chrome',
    //    sharedTestFiles: true,
    //    maxInstances: 1,
    //    chromeOptions: {
    //        args: [
    //            '--start-maximized']
    //    }
    //}, {
        //browserName: 'firefox',
        //'moz:firefoxOptions': {
        //    args: [
        //        '--safe-mode']
        //    }
        //}],
    maxSessions: 1,
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
        global.isAngularSite = function (flag) {
            browser.ignoreSynchronization = !flag;
            return browser.driver.wait(function () {
                return browser.driver.getCurrentUrl(function (url) {
                    return /activity/.test(url);
                });
            });
        }
    },
    params: {
        login: {
            user: 'MitchellC',
            password: 'Timp1234'
        }
    },
    jasmineNodeOpts: {
        showColors: true,
        defaultTimoutInterval: 10000
    },
};