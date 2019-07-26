 //experiment.js
describe('UofU Loginpage', function () {

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/');
    });

    it('Fail login', function () {
        element(by.buttonText('Log In to MyChart')).click();
        browser.sleep(5000);
        browser.getAllWindowHandles().then(function (handles) {
            browser.switchTo().window(handles[1]);
            browser.sleep(5000);
            expect(browser.getTitle()).toEqual('MyChart - Login Page');
        })

    })
});