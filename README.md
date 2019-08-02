      # Xactware-Assessment
Assumptions: Node is installed on machine

Things to install before testing, using node shell:
"npm install -g protractor",
"webdriver-manager update",
"npm install protractor-jasmine2-html-reporter""

TO RUN TEST:
(In one node shell) "webdriver-manager start"
In a separate node shell, navigate to the test file location(This may be different for you).     "cd source/repos/Xactware-Assessment".

Enter in "protractor conf.js" (or 'protractor conf.js --suite loginpage' to do a specific suite. See list of suites in the conf file)

NOTE: 3 tests don't work in Firefox. Direct browser control is different for firefox and I haven't figured out how to fix that yet