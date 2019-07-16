 //1spec.js
describe('UofU Homepage', function () {
    var firstNumber = element(by.model('first'));
    var secondNumber = element(by.model('second'));
    var goButton = element(by.id('gobutton'));
    var latestResult = element(by.binding('latest'));

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/');
    });

    it('Main site has a title (Should succeed)', function () {
        expect(browser.getTitle()).toEqual('University of Utah Health | University of Utah Health');
    });
});