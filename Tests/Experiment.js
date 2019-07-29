 //experiment.js
describe('Experiment with different tests', function () {
    var list = "doc in filteredDoctors | orderBy: 'lastName' | filter:language | filter:location | filter:specialties:true | filter:gender.female:true | filter:gender.male:true ";

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/fad/');
    });

    it('Search for a doctor', function () {
        element(by.id('fad-dropdown'))
            .all(by.tagName('option'))
            .get(2)
            .click();
        element(by.model('specialistSpecialties_value')).sendkeys('Family Medicine')
            //arrow down key
            //enter key
        element(by.model('location')).sendKeys('Farmington Health Center');
        element(by.model('gender.male')).click();
        element(by.model('language')).sendKeys('Afrikaans').click();
            expect(element.all(by.repeater(list)).count()).toEqual(1);
    });

    it('Search for a doctor', function () { //This reveals a bug in the code
        element(by.id('fad-dropdown'))
            .all(by.tagName('option'))
            .get(1)
            .click();
        element(by.id('fad-dropdown'))
            .all(by.tagName('option'))
            .get(1)
            .click();
        element(by.model('specialistSpecialties_value')).sendkeys('Family Medicine')
        expect(element.all(by.repeater(list)).count()).toEqual(1);
    });
});