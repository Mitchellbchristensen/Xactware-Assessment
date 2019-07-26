var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime){
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "d8bfa915a0eec30771db36c42d34ffdf",
        "instanceId": 10052,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f70016-0031-008c-000c-00110070006e.png",
        "timestamp": 1564009769193,
        "duration": 9343
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "d6d04d81-4af5-4652-a3df-ee1c6d437e2d",
        "instanceId": 5264,
        "browser": {
            "name": "firefox"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00230075-002b-007a-00b9-00c9007a0081.png",
        "timestamp": 1564009788077,
        "duration": 6587
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "5337bde613c0043af705ad4b8c3e1a21",
        "instanceId": 5132,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a600ec-0047-00bb-006c-00ae00850009.png",
        "timestamp": 1564095200735,
        "duration": 15762
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "db2bbbf6-4e83-47b7-94e0-35561015239a",
        "instanceId": 6140,
        "browser": {
            "name": "firefox"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00020094-00d5-0031-003a-005100cb0040.png",
        "timestamp": 1564095253257,
        "duration": 15398
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "4c4a35a20dbc02bf654541a2d37918f3",
        "instanceId": 2680,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095346000,
                "type": ""
            }
        ],
        "screenShotFile": "009d0081-001d-0099-00e3-00410093000b.png",
        "timestamp": 1564095339149,
        "duration": 6882
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "6b736d7768fcfbaa4d6eb6f037f94718",
        "instanceId": 8340,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095514876,
                "type": ""
            }
        ],
        "screenShotFile": "00bd0088-0088-0023-0000-00fd008c0040.png",
        "timestamp": 1564095508886,
        "duration": 6036
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "a005da6d3349b577e480c016a1782f82",
        "instanceId": 14356,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095556613,
                "type": ""
            }
        ],
        "screenShotFile": "005700e8-00f2-0022-0049-003d00990084.png",
        "timestamp": 1564095551795,
        "duration": 4851
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "6b5d1384326fb54e79f7cfe06b86fe66",
        "instanceId": 18492,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095582906,
                "type": ""
            }
        ],
        "screenShotFile": "0039007c-005f-00c8-0077-0048006c00b5.png",
        "timestamp": 1564095576615,
        "duration": 6324
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "4e77abe476e427edc5c0566aaad10125",
        "instanceId": 17340,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'https://healthcare.utah.edu/' to match /\\/url/."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:14:41)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095643794,
                "type": ""
            }
        ],
        "screenShotFile": "006d006c-00ec-0051-00be-00c600ec0031.png",
        "timestamp": 1564095638358,
        "duration": 15495
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "63993cd74933f88ef9f014cb508b0b2e",
        "instanceId": 14252,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'https://healthcare.utah.edu/' to match /\\/url/."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:14:41)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095673311,
                "type": ""
            }
        ],
        "screenShotFile": "004000c5-00de-0071-005d-006e00a8004f.png",
        "timestamp": 1564095668505,
        "duration": 14866
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "cd1092ce7929cf7207e83423537dabab",
        "instanceId": 14112,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095705093,
                "type": ""
            }
        ],
        "screenShotFile": "009300ca-00a3-0092-00b6-006b006100a3.png",
        "timestamp": 1564095700719,
        "duration": 14402
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "476a7b17837934a67a1ecb37541a1ff7",
        "instanceId": 11528,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095730730,
                "type": ""
            }
        ],
        "screenShotFile": "001800b8-0056-00b4-00bf-000b00d500db.png",
        "timestamp": 1564095726808,
        "duration": 4048
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "1b0547b32438c435ed585f88619f2e58",
        "instanceId": 19008,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095750897,
                "type": ""
            }
        ],
        "screenShotFile": "00b500f8-005c-00b4-00e7-007a008d0013.png",
        "timestamp": 1564095746120,
        "duration": 5805
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "5440166564aa175b5f70815fe2116abb",
        "instanceId": 16776,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564095769415,
                "type": ""
            }
        ],
        "screenShotFile": "00340079-0068-0081-0060-00e900a9003c.png",
        "timestamp": 1564095765411,
        "duration": 14030
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "d57b9225f9ca9cabf8fe996fa13ee268",
        "instanceId": 17260,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: by.text is not a function"
        ],
        "trace": [
            "TypeError: by.text is not a function\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:13:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007e00ff-000c-0090-001e-0012007c00d6.png",
        "timestamp": 1564095913611,
        "duration": 5565
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "4990f7ffba5a547131353735b50247e7",
        "instanceId": 17404,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: text is not defined"
        ],
        "trace": [
            "ReferenceError: text is not defined\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:13:24)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00c100ba-0079-0050-009b-0097008b00dd.png",
        "timestamp": 1564095987775,
        "duration": 5720
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "f19f75e1e87e0011e9851831483a406b",
        "instanceId": 16740,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'https://healthcare.utah.edu/' to match 'https://mychart.med.utah.edu/mychart/default.asp'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:41)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564096242536,
                "type": ""
            }
        ],
        "screenShotFile": "0021005a-00ea-0099-00d5-00a0001b0025.png",
        "timestamp": 1564096238066,
        "duration": 14518
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "e28c8b966405ee70cef20e38aaa6e3b9",
        "instanceId": 17424,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'https://healthcare.utah.edu/' to match 'https://mychart.med.utah.edu/mychart/default.asp'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:42)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564096279380,
                "type": ""
            }
        ],
        "screenShotFile": "008f0006-00cd-00e7-0026-00cd0058009b.png",
        "timestamp": 1564096275039,
        "duration": 14388
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "e671ebb178691e47ae01d9e86d5cde2e",
        "instanceId": 11600,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'https://healthcare.utah.edu/' to match 'https://mychart.med.utah.edu/mychart/default.asp'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:42)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564096309217,
                "type": ""
            }
        ],
        "screenShotFile": "00f20022-007b-0063-0079-005500070021.png",
        "timestamp": 1564096305446,
        "duration": 13820
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "acc7519114542bdd5f1f96aa56effd2a",
        "instanceId": 15632,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: browser.CurrentUrl is not a function"
        ],
        "trace": [
            "TypeError: browser.CurrentUrl is not a function\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:24)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004500d8-003e-00cd-00b5-00bd0083008d.png",
        "timestamp": 1564096348136,
        "duration": 3989
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "e7e67ce28fbd08d4536869be48375eca",
        "instanceId": 11696,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'https://healthcare.utah.edu/' to equal 'https://mychart.med.utah.edu/mychart/default.asp'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:41)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564096472888,
                "type": ""
            }
        ],
        "screenShotFile": "00ee00c3-0058-00a0-004e-007e00420054.png",
        "timestamp": 1564096468550,
        "duration": 14394
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "3abefcfc86a67649ec64a952ddbb2476",
        "instanceId": 5664,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: Cannot read property 'ver' of null",
            "Failed: getCurrentUrl is not defined"
        ],
        "trace": [
            "TypeError: Cannot read property 'ver' of null\n    at executeAsyncScript_.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:716:56)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:4:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)",
            "ReferenceError: getCurrentUrl is not defined\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:9)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at Function.next.fail (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4274:9)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "timestamp": 1564096872337,
        "duration": 20205
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "00fc8a357f6fbf67920097e1adf81927",
        "instanceId": 15212,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: chrome not reachable\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown",
            "Failed: getCurrentUrl is not defined"
        ],
        "trace": [
            "WebDriverError: chrome not reachable\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.get(https://healthcare.utah.edu/) - get url\n    at thenableWebDriverProxy.schedule (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeScriptWithDescription (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:404:28)\n    at driver.wait (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:686:29)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:938:14\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: <anonymous>\n    at pollCondition (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2195:19)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2191:7\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2190:22\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: waiting for page to load for 10000ms\n    at scheduleWait (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2188:20)\n    at ControlFlow.wait (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2517:12)\n    at thenableWebDriverProxy.wait (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:934:29)\n    at driver.controlFlow.execute.then.then.then.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:685:32)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:4:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)",
            "ReferenceError: getCurrentUrl is not defined\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:9)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at Function.next.fail (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4274:9)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "timestamp": 1564096904198,
        "duration": 16237
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "67b8b4e0d10824fb967556e82e127db6",
        "instanceId": 10816,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: Cannot read property 'ver' of null",
            "Failed: getCurrentUrl is not defined"
        ],
        "trace": [
            "TypeError: Cannot read property 'ver' of null\n    at executeAsyncScript_.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:716:56)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:4:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)",
            "ReferenceError: getCurrentUrl is not defined\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:9)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at Function.next.fail (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4274:9)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "timestamp": 1564096999777,
        "duration": 26302
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "811425f569ac9d2756f8e8ac2c066c67",
        "instanceId": 15768,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: getCurrentUrl is not defined"
        ],
        "trace": [
            "ReferenceError: getCurrentUrl is not defined\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:9)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007500fd-0030-007f-0093-00b500c400ca.png",
        "timestamp": 1564097038309,
        "duration": 4260
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "527117d6952b12711711d57b6459dc64",
        "instanceId": 19148,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564097219918,
                "type": ""
            }
        ],
        "screenShotFile": "008300dc-00b2-005a-003f-0040004900c7.png",
        "timestamp": 1564097213952,
        "duration": 16029
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "b2c2b1a21e557bd6ee85ac37f6e2b34c",
        "instanceId": 17124,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.waitForAngular()\n    at thenableWebDriverProxy.schedule (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:425:28)\n    at angularAppRoot.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564097523512,
                "type": ""
            }
        ],
        "timestamp": 1564097517859,
        "duration": 15759
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "fdd0ec167b5dc235ec8d225bc5539777",
        "instanceId": 2688,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.waitForAngular()\n    at thenableWebDriverProxy.schedule (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:425:28)\n    at angularAppRoot.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564097609195,
                "type": ""
            }
        ],
        "timestamp": 1564097603650,
        "duration": 15645
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "1fa45d2ba67b56961c151374d747f382",
        "instanceId": 17104,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.waitForAngular()\n    at thenableWebDriverProxy.schedule (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:425:28)\n    at angularAppRoot.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564098128476,
                "type": ""
            }
        ],
        "timestamp": 1564098122071,
        "duration": 26508
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "10559c160860bcbebf4fc0b85c919fbf",
        "instanceId": 7488,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'https://healthcare.utah.edu/' to equal 'https://mychart.med.utah.edu/mychart/default.asp'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:12:41)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564098213986,
                "type": ""
            }
        ],
        "screenShotFile": "006d008d-004d-00b0-001e-0055004600f3.png",
        "timestamp": 1564098208312,
        "duration": 10719
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "161deac5e354605660c9da0945d229fb",
        "instanceId": 16460,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: browser.Close is not a function"
        ],
        "trace": [
            "TypeError: browser.Close is not a function\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:17)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0076009c-000d-007f-005b-0063001c00f8.png",
        "timestamp": 1564098272389,
        "duration": 6505
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "3215c4f251376cfb3ac897f433422c03",
        "instanceId": 7356,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: browser.SwitchTo is not a function"
        ],
        "trace": [
            "TypeError: browser.SwitchTo is not a function\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:17)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002a00e2-007d-0060-0027-00ef0042001b.png",
        "timestamp": 1564098340079,
        "duration": 5606
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "4f134d80b859135db2cbfde91d5ff8c9",
        "instanceId": 2008,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: tab is not defined"
        ],
        "trace": [
            "ReferenceError: tab is not defined\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:35)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0053004f-0013-00dc-005f-004300430003.png",
        "timestamp": 1564098371085,
        "duration": 5456
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "5be944d0c7665efe09e676ba4aa06d35",
        "instanceId": 6132,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: browser.switchTo(...).Window is not a function"
        ],
        "trace": [
            "TypeError: browser.switchTo(...).Window is not a function\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:28)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00be0079-0019-001a-00c9-00ff00b80087.png",
        "timestamp": 1564098403490,
        "duration": 5377
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "c45c6a6bc8a37a6731e8a0bb2cc0fe17",
        "instanceId": 14932,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: invalid argument: 'handle' must be a string\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "WebDriverError: invalid argument: 'handle' must be a string\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebDriver.switchTo().window(undefined)\n    at thenableWebDriverProxy.schedule (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.window (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1844:25)\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:28)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564098431814,
                "type": ""
            }
        ],
        "screenShotFile": "007000a9-00c7-0093-007d-009f00cd003b.png",
        "timestamp": 1564098425839,
        "duration": 11010
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "3439e1fd69fde6e84529e52b83dc6365",
        "instanceId": 18788,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: invalid argument: 'handle' must be a string\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "WebDriverError: invalid argument: 'handle' must be a string\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebDriver.switchTo().window(1)\n    at thenableWebDriverProxy.schedule (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.window (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1844:25)\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:28)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564098477384,
                "type": ""
            }
        ],
        "screenShotFile": "007a0078-005b-0096-00a9-00ea006b0052.png",
        "timestamp": 1564098471981,
        "duration": 10440
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "38fc8f4256567b56b02f6a2b6e209147",
        "instanceId": 5092,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'https://healthcare.utah.edu/' to equal 'https://mychart.med.utah.edu/mychart/default.asp'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:12:41)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564098595434,
                "type": ""
            }
        ],
        "screenShotFile": "006600c4-00eb-0069-007a-00cd00430050.png",
        "timestamp": 1564098589225,
        "duration": 11266
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "130c484c0057547b4205ed549138b013",
        "instanceId": 18092,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.waitForAngular()\n    at thenableWebDriverProxy.schedule (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:425:28)\n    at angularAppRoot.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564098752169,
                "type": ""
            }
        ],
        "timestamp": 1564098746114,
        "duration": 6155
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "a692b6744fefc5eb94db4107aeb05fb7",
        "instanceId": 1128,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:12:36)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564099610865,
                "type": ""
            }
        ],
        "screenShotFile": "00d6001b-008b-0005-00dd-007600ac0020.png",
        "timestamp": 1564099604837,
        "duration": 11076
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "df4e3bc11364ff833fc78941cffd1c31",
        "instanceId": 17676,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:36)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564099684455,
                "type": ""
            }
        ],
        "screenShotFile": "00aa00f4-0044-0043-0045-000200f900c8.png",
        "timestamp": 1564099678262,
        "duration": 6237
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "3b74d85228ac4c58c66e724c4629d5fd",
        "instanceId": 5052,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:36)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564099710359,
                "type": ""
            }
        ],
        "screenShotFile": "00270079-00f5-00ca-0079-0099004800b9.png",
        "timestamp": 1564099705061,
        "duration": 10340
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": true,
        "pending": false,
        "sessionId": "47702d8898b4f11782a93a342786d5ff",
        "instanceId": 3552,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564099739088,
                "type": ""
            }
        ],
        "screenShotFile": "007f0080-00e8-0029-007f-001500a000fe.png",
        "timestamp": 1564099733231,
        "duration": 10880
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "04a83319bcbdd6435278d71096e6c60c",
        "instanceId": 16896,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:36)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564099771994,
                "type": ""
            }
        ],
        "screenShotFile": "0039005e-0085-00db-0091-00e2003100b1.png",
        "timestamp": 1564099766666,
        "duration": 55374
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "076aea3a0efca8bf7cd65c843df5e733",
        "instanceId": 784,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:11:36)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564099838469,
                "type": ""
            }
        ],
        "screenShotFile": "007c00e2-00bf-002c-007b-00760007008b.png",
        "timestamp": 1564099832616,
        "duration": 15898
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "5add839c47c03387fbb748291324a065",
        "instanceId": 17604,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100112172,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Login: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100118220,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Password: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100118220,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #jsenabled: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100118220,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #loginForm: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100118220,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #submit: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100118220,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://mychart.med.utah.edu/mychart/scripts/core/debug.min.js?updateDt=1533203510 1:2726 \"[Debug.js LOCALHOST DEBUG] ResizePage called before context was set. You should not call any part of the UI Framework before OnPageLoad has finished.\" \"\"",
                "timestamp": 1564100118221,
                "type": ""
            }
        ],
        "screenShotFile": "007e00fc-000f-00c0-00c7-001c006000f7.png",
        "timestamp": 1564100105549,
        "duration": 12694
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "a792ccc944b9e69e78d4507ec7cae774",
        "instanceId": 19260,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100375593,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Login: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100386645,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Password: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100386645,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #jsenabled: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100386645,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #loginForm: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100386645,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #submit: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100386645,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://mychart.med.utah.edu/mychart/scripts/core/debug.min.js?updateDt=1533203510 1:2726 \"[Debug.js LOCALHOST DEBUG] ResizePage called before context was set. You should not call any part of the UI Framework before OnPageLoad has finished.\" \"\"",
                "timestamp": 1564100386646,
                "type": ""
            }
        ],
        "screenShotFile": "00bc003a-003c-0022-003a-00de00a8000c.png",
        "timestamp": 1564100370019,
        "duration": 16647
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "7b815804d12ea163a485f06d396d70f4",
        "instanceId": 4184,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:14:40)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100462626,
                "type": ""
            }
        ],
        "screenShotFile": "001e00cc-00f9-00f3-002b-008900320073.png",
        "timestamp": 1564100456789,
        "duration": 5901
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "1af128a4285257a172c4be70bafdc1b8",
        "instanceId": 8516,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:15:40)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100498707,
                "type": ""
            }
        ],
        "screenShotFile": "00b6006c-000d-00dc-00c4-00ad001c0010.png",
        "timestamp": 1564100493055,
        "duration": 10711
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "05a7d5630e72a257556286859a0d0f27",
        "instanceId": 11320,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:15:40)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100525356,
                "type": ""
            }
        ],
        "screenShotFile": "00d700dc-009b-0066-00f8-00bd00c90099.png",
        "timestamp": 1564100519742,
        "duration": 6672
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "4bca314405d47d71d610df75bd25848c",
        "instanceId": 16296,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:15:40)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100575208,
                "type": ""
            }
        ],
        "screenShotFile": "005f00b8-0059-0053-0041-00f20039007b.png",
        "timestamp": 1564100569315,
        "duration": 6944
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "43b30134e69e589403d93621e2d01a7d",
        "instanceId": 17868,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:15:40)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100598733,
                "type": ""
            }
        ],
        "screenShotFile": "006c00ad-00e0-007d-0097-00d40045003f.png",
        "timestamp": 1564100592537,
        "duration": 16261
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "e4145ff3bce11be588950f8619a43ae7",
        "instanceId": 17980,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: invalid argument: 'handle' must be a string\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "WebDriverError: invalid argument: 'handle' must be a string\n  (Session info: chrome=75.0.3770.142)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'MITCHELLBC', ip: '192.168.1.184', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_211'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebDriver.switchTo().window(undefined)\n    at thenableWebDriverProxy.schedule (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.window (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1844:25)\n    at C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:12:32\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100660194,
                "type": ""
            }
        ],
        "screenShotFile": "00df007b-00ae-003a-00b1-00d0005f0003.png",
        "timestamp": 1564100654297,
        "duration": 5946
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "5f8d4a2c7c03fe28524fdb9c862ccfdd",
        "instanceId": 11872,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100737251,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Login: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100753496,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Password: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100753496,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #jsenabled: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100753496,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #loginForm: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100753496,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #submit: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100753497,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://mychart.med.utah.edu/mychart/scripts/core/debug.min.js?updateDt=1533203510 1:2726 \"[Debug.js LOCALHOST DEBUG] ResizePage called before context was set. You should not call any part of the UI Framework before OnPageLoad has finished.\" \"\"",
                "timestamp": 1564100753497,
                "type": ""
            }
        ],
        "screenShotFile": "0056005a-006d-0098-00e6-003a007f0049.png",
        "timestamp": 1564100731887,
        "duration": 21631
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "bc1e4f8b17667db128b6ec8f38c01e7a",
        "instanceId": 7368,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100805432,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Login: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100811486,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Password: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100811486,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #jsenabled: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100811486,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #loginForm: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100811486,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #submit: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564100811486,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://mychart.med.utah.edu/mychart/scripts/core/debug.min.js?updateDt=1533203510 1:2726 \"[Debug.js LOCALHOST DEBUG] ResizePage called before context was set. You should not call any part of the UI Framework before OnPageLoad has finished.\" \"\"",
                "timestamp": 1564100811487,
                "type": ""
            }
        ],
        "screenShotFile": "004300e3-0014-0010-0026-004e00120025.png",
        "timestamp": 1564100799465,
        "duration": 12042
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "c542db378e5d7b652d6ba64b27d1ba15",
        "instanceId": 17104,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:14:40)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100866299,
                "type": ""
            }
        ],
        "screenShotFile": "0031008c-008f-004d-001c-009b00eb0070.png",
        "timestamp": 1564100859622,
        "duration": 6724
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "d822bbcc5285770d7ca485b559e30b82",
        "instanceId": 10392,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:14:40)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100892158,
                "type": ""
            }
        ],
        "screenShotFile": "00470087-0018-0082-00e8-00fe00b70006.png",
        "timestamp": 1564100885595,
        "duration": 16607
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "b9d33dc970927bcc862212fd62244ca9",
        "instanceId": 11040,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:14:40)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564100962705,
                "type": ""
            }
        ],
        "screenShotFile": "00ec0066-004b-002c-009a-000b003b0082.png",
        "timestamp": 1564100956657,
        "duration": 7956
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "ba4695777f64f5512853f38dc91c248a",
        "instanceId": 13440,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Expected 'University of Utah Health | University of Utah Health' to equal 'MyChart - Login Page'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:14:40)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564101029089,
                "type": ""
            }
        ],
        "screenShotFile": "00b7004d-0078-00d5-0045-002b0029003f.png",
        "timestamp": 1564101023391,
        "duration": 5956
    },
    {
        "description": "Fail login|UofU Loginpage",
        "passed": false,
        "pending": false,
        "sessionId": "c0bd122055d6843df5910f9657baea89",
        "instanceId": 5776,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Fail login\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:8:5)\n    at addSpecsToSuite (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Mitchell Christensen\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Mitchell Christensen\\source\\repos\\Xactware-Assessment\\tests\\experiment.js:2:1)\n    at Module._compile (internal/modules/cjs/loader.js:776:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)\n    at Module.load (internal/modules/cjs/loader.js:653:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:593:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://healthcare.utah.edu/ 448:181 Uncaught ReferenceError: EW_checkMyForm is not defined",
                "timestamp": 1564101256499,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Login: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564101267549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #Password: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564101267549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #jsenabled: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564101267549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #loginForm: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564101267549,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://mychart.med.utah.edu/mychart/default.asp - [DOM] Found 2 elements with non-unique id #submit: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1564101267549,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://mychart.med.utah.edu/mychart/scripts/core/debug.min.js?updateDt=1533203510 1:2726 \"[Debug.js LOCALHOST DEBUG] ResizePage called before context was set. You should not call any part of the UI Framework before OnPageLoad has finished.\" \"\"",
                "timestamp": 1564101267550,
                "type": ""
            }
        ],
        "screenShotFile": "00f0001b-0099-004d-0040-00a9001800ed.png",
        "timestamp": 1564101247947,
        "duration": 19623
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

