 //experiment.js
describe('Experiment with different tests', function () {
    beforeEach(function () {
        browser.get('');
    });

    it('Fail login', function () {
        log.sendKeys(browser.params.login.user); //referencing a variable and a paramater/user (This wasn't nessesary but I wanted to show I could do it)
        pass.sendKeys(browser.params.login.password);
        Lb.click();
        browser.getAllWindowHandles().then(function (handles) {
            newWindowHandle = handles[1];
            browser.switchTo().window(newWindowHandle).then(function () {
                expect(browser.driver.getTitle()).toEqual('MyChart - Login Page')
                expect(browser.driver.findElement(by.id('loginErrorMessage')).isDisplayed())
            })
        });
    })
});