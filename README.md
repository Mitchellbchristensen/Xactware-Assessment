      # Xactware-Assessment

Things to install using node cmd prompt
npm install -g protractor
webdriver-manager update
npm install protractor-jasmine2-html-reporter

TO RUN TEST
(In one node command prompt) webdriver-manager start

(In a new node command prompt) navigate to the file location. This may be different for you     cd source/repos/Xactware-Assessment
protractor conf.js (or '--suite loginpage' to do a specific suite. See list of specs in the conf file)

NOTE: 3 test don't work in firefox. Direct browser control is different for firefox and I haven't figured out how to fix that yet