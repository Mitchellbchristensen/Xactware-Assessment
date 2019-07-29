// 2spec.js
describe('Find a Doctor page', function () {

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/fad/');
    });

    it('Search for a doctor by name', function () {
        element(by.model('query')).sendKeys('Burke');
        expect(element.all(by.repeater("doc in docs | filter: {fullName: query} | orderBy:'lastName'")).count()).toEqual(2);
    });

    it('Search for a doctor', function () {
        element(by.id('fad-dropdown'))
            .all(by.tagName('option'))
            .get(1)
            .click();
        element(by.model('primaryCare'))
            .all(by.tagName('option'))
            .get(4)
            .click();
        element(by.model('location')).sendKeys('University H');
        element(by.model('gender.female')).click();
        element(by.model('language')).sendKeys('Spanish').click();
        expect(element.all(by.repeater(list)).count()).toEqual(1);
    });
});