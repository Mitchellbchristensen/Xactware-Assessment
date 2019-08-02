// 2spec.js
describe('Find a Doctor page', function () {
    var listPrimary = "doc in filteredDoctors | orderBy: 'lastName' | filter:language | filter:location | filter:specialties:true | filter:gender.female:true | filter:gender.male:true ";
    var listSpecialist1 = "doc in filteredDoctors | orderBy: 'lastName' | filter:language | filter:location | filter:specialties:true | filter:gender.female:true | filter:gender.male:true ";
    var listSpecialist2 = "doc in filteredDoctors | orderBy: 'lastName' | filter:language | filter:location | filter:specialties:true | filter:gender.female:true | filter:gender.male:true "

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/fad/');
    });

    it('Search for a doctor by name', function () {
        element(by.model('query')).sendKeys('Burke');
        expect(element.all(by.repeater("doc in docs | filter: {fullName: query} | orderBy:'lastName'")).count()).toEqual(2);
    });

    it('Search for a doctor by Primary Care Provider option', function () {
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
            // I want this expect to be more solid. Maybe have it based on options I had clicked in before(Maybe there is a different element I could also be looking at).
        expect(element.all(by.repeater(listPrimary)).count()).toEqual(1);
    });

    it('Search for a doctor by Specialist option', function () {
        element(by.id('fad-dropdown'))
            .all(by.tagName('option'))
            .get(2)
            .click();
        element(by.id('specialistSpecialties_value')).sendKeys('Family Medicine')
            .sendKeys(protractor.Key.DOWN)
            .sendKeys(protractor.Key.ENTER);
        element(by.model('location')).sendKeys('Farmington Health Center');
        element(by.model('gender.male')).click();
        element(by.model('language')).sendKeys('Afrikaans').click();
        //I want this expect to be more solid. Maybe have it based on options I had clicked in before(Maybe there is a different element I could also be looking at).
        expect(element.all(by.repeater(listSpecialist1)).count()).toEqual(1);
    });

    it('Switch between search options to ensure they still work', function () {
        element(by.id('fad-dropdown'))
            .all(by.tagName('option'))
            .get(1)
            .click();
        element(by.model('primaryCare'))
            .all(by.tagName('option'))
            .get(4)
            .click();
        element(by.id('fad-dropdown'))
            .all(by.tagName('option'))
            .get(2)
            .click();
        element(by.id('specialistSpecialties_value')).sendKeys('Family Medicine')
            .sendKeys(protractor.Key.DOWN)
            .sendKeys(protractor.Key.ENTER);
        element(by.id('fad-dropdown'))
            .all(by.tagName('option'))
            .get(1)
            .click();
        element(by.model('primaryCare'))
            .all(by.tagName('option'))
            .get(3)
            .click();
        // I want this expect to be more solid. Maybe have it based on options I had clicked in before(Maybe there is a different element I could also be looking at).
        expect(element.all(by.repeater(listSpecialist2)).count()).toEqual(63);
    });

    it('Search for a doctor by name, click on the result, follow the link', function () {
        element(by.model('query')).sendKeys('Burke');
        element.all(by.repeater("doc in docs | filter: {fullName: query} | orderBy:'lastName'"))
            .get(0)
            .click();
        browser.getAllWindowHandles().then(function (handles) {
            newWindowHandle = handles[1];
            browser.switchTo().window(newWindowHandle).then(function () {
                expect(browser.getCurrentUrl()).toEqual('https://healthcare.utah.edu/fad/mddetail.php?physicianID=u0030564');
            })
        });
    });
});