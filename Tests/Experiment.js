 //experiment.js
// 
describe('Experiment with different tests', function () {

    var searchIcon = element(by.className('a-icon  a-icon--small  u-space-right--small'));
    var searchField = element(by.id('mainSearchModal'));

    beforeEach(function () {
        browser.get('https://www.xactware.com/en-us/');
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

    //it('Search for keyword', function () {
    //    element(by.id('q')).sendKeys('xactimate').sendKeys(protractor.Key.ENTER);
    //    expect(browser.getTitle()).toEqual('Resources - Xactware Search | Xactware');
    //});
    //it('Click on header products-Xactimate', function () {
    //    browser.waitForAngular();
    //    browser.actions().mouseMove(
    //        element(by.id('menu'))
    //            .element(by.css('a[href*="/en-us/products/"]'))).perform();
    //    element(by.css('a[href*="/en-us/solutions/claims-estimating/xactimate/professional/"]')).click();
    //    expect(browser.driver.getCurrentUrl()).toEqual('https://www.xactware.com/en-us/solutions/claims-estimating/xactimate/professional/');
    //});
})