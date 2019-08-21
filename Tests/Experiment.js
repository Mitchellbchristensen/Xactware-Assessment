 //experiment.js
// 
describe('Experiment with different tests', function () {

    var searchIcon = element(by.className('a-icon  a-icon--small  u-space-right--small'));
    var searchField = element(by.id('mainSearchModal'));

    beforeEach(function () {
        browser.get('');
    });
    afterEach(function () {
        browser.getAllWindowHandles().then(function (handles) {
            for (let i = 1; i < handles.length; i++) {
                if (handles[i]) {
                    browser.driver.switchTo().window(handles[i]);
                    browser.driver.close();
                }
            }
            browser.driver.switchTo().window(handles[0]);
        });
    });

    it('Search for keyword and click on predictive results', function () {
        searchIcon.click();
        searchField.sendKeys('mychart');
        element.all(by.repeater('g in general')).
            get(2).
            element(by.linkText('mychart-video-visit-updated.pdf')).
            click();
        expect(browser.driver.getCurrentUrl()).toEqual('https://healthcare.utah.edu/telehealth/docs/mychart-video-visit-updated.pdf');
    });
})