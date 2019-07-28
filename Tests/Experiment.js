 //experiment.js
describe('Experiment with different tests', function () {
    var username = element(by.model('login'));
    var password = element(by.id('password'));
    var login = element(buttonText('Log In to MyChart'));

    beforeEach(function () {
        browser.get('');
    });

    it('Fail login', function () {
        username.sendKeys(browser.params.login.user); //referencing a variable and a paramater/user (This wasn't nessesary but I wanted to show I could do it)
        password.sendKeys(browser.params.login.password);
        login.click();
        browser.getAllWindowHandles().then(function (handles) {
            newWindowHandle = handles[1];
            browser.switchTo().window(newWindowHandle).then(function () {
                expect(browser.driver.getTitle()).toEqual('MyChart - Login Page')
                expect(browser.driver.findElement(by.id('loginErrorMessage')).isDisplayed())
            })
        });
    })
});