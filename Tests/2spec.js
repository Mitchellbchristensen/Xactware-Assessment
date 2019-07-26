// 2spec.js
describe('Find a Doctor page', function () {

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/fad/');
    });

    //it('Search for a doctor by name', function () {
    //    element(by.model('query')).sendKeys('Burke');
    //    expect(element.all(by.repeater("doc in docs | filter: {fullName: query} | orderBy:'lastName'")).count()).toEqual(2);
    //});

    it('Search for a doctor', function () {
        var iWantToSee = element.all(by.id('fad-dropdown'))
            .then(function (options) {
                options[1].click();
                //element(by.id('fad-dropdown')).sendKeys('specialist');
                //element(by.id('specialistSpecialties_value')).sendKeys('Occupational Therapy');
                //element(by.model('location')).sendKeys('');
                //element(by.model('gender.female')).sendKeys('');
                //element(by.model('language')).sendKeys('');
                //expect(element.all(by.repeater("doc in docs | filter: {fullName: query} | orderBy:'lastName'")).count()).toEqual(2);
            });
    }
});