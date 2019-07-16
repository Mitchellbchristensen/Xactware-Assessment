// conf.js

//Simple Conf for testing
//exports.config = {
//    seleniumAddress: 'http://localhost:4444/wd/hub',
//    specs: ['./tests/1spec.js']
//};

exports.config = {
    framework: 'jasmine',
    seleniumAddress: 'http://localhost:4444/wd/hub',
    suites: {
        homepage: './tests/1spec.js',
        loginpage: './tests/2spec.js',
        experiement: './tests/Experiement.js'
    },
    multipleCapabilities: [{
        browserName: 'firefox'
    }, {
        browserName: 'chrome'
        }],
    onPrepare: function () {
        chromeOptions: {
            args: ['--start-maximized']
        }
    },
    onPrepare: function () {
        var folderName = (new Date()).toString().split(' ').splice(1, 4).join(' ');
        var mkdirp = require('mkdirp');
        var newfolder = "./reports/" + folderName;
        require('jasmine-reporters');

        mkdirp(newFolder, function (err) {
            if (err) {
                console.error(err);
            } else {
                jasmine.getEnv().addReporter(new jasmine.JUnitXmlReporter(newFolder, true, true));
            }
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
        defaultTimoutInterval: 30000
    }
};