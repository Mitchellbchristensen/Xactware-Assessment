 //experiment.js
describe('Experiment with different tests', function () {
    var list = "doc in filteredDoctors | orderBy: 'lastName' | filter:language | filter:location | filter:specialties:true | filter:gender.female:true | filter:gender.male:true ";

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/fad/');
    });

    it('Search for a doctor', function () {
        element(by.id('fad-dropdown'))
            .all(by.tagName('option'))
            .get(1)
            .click();
        element(by.model('primaryCare'))
            .all(by.tagName('option'))
            .get(3)
            .click();
        element(by.model('location')).sendKeys('University H');
        element(by.model('gender.female')).click();
        element(by.model('language')).sendKeys('Spanish').click();
            expect(element.all(by.repeater(list)).count()).toEqual(1);
    });
});

//<select id="locregion" class="create_select ng-pristine ng-invalid ng-invalid-required" required="" ng-disabled="organization.id !== undefined" ng-options="o.id as o.name for o in organizations" ng-model="organization.parent_id">
//    <option value="?" selected="selected"></option>
//    <option value="0">Ranjans Mobile Testing</option>
//    <option value="1">BeaverBox Testing</option>
//    <option value="2">BadgerBox</option>
//    <option value="3">CritterCase</option>
//    <option value="4">BoxLox</option>
//    <option value="5">BooBoBum</option>
//</select>