 //1spec.js
describe('UofU Homepage', function () {

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/');
    });

    it('Main site has a title (Should succeed)', function () {
        expect(browser.getTitle()).toEqual('University of Utah Health | University of Utah Health');
    });
    it('Fail login', function () {
        element(by.buttonText('Log In to MyChart')).click();
        browser.sleep(10000);
        expect(browser.getCurrentUrl()).toMatch('https://mychart.med.utah.edu/mychart/default.asp')
    })
});