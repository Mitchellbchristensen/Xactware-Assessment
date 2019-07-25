 //1spec.js
describe('UofU Homepage', function () {

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/');
    });

    it('Main site has a title (Should succeed)', function () {
        expect(browser.getTitle()).toEqual('University of Utah Health | University of Utah Health');
    });
});
