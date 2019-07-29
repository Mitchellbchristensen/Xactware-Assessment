 //1spec.js
describe('UofU Homepage', function () {
    var username = element(by.model('login'));
    var password = element(by.id('password'));
    var login = element(buttonText('Log In to MyChart'));

    beforeEach(function () {
        browser.get('');
    });

    it('Main site has a title (Should succeed)', function () {
        expect(browser.getTitle()).toEqual('University of Utah Health | University of Utah Health');
    });

    it('Login button redirects to MyChart', function () {
        element(by.buttonText('Log In to MyChart')).click();
        //The browser had a hard time waiting for the new tab (This is better than a browser.sleep)
        browser.getAllWindowHandles().then(function (handles) {
            newWindowHandle = handles[1];
            browser.switchTo().window(newWindowHandle).then(function () {
                //I found out that the mychart site is't angular so I have to use browser.driver
                expect(browser.driver.getTitle()).toEqual('MyChart - Login Page')
            })
        });
    });

    it('Fail login', function () {
        username.sendKeys(browser.params.login.user); //referencing a variable and a paramater/user (This wasn't nessesary but I wanted to show I could do it)
        password.sendKeys(browser.params.login.password);
        login.click();
        browser.getAllWindowHandles().then(function (handles) {
            newWindowHandle = handles[1];
            browser.switchTo().window(newWindowHandle).then(function () {
                expect(browser.driver.findElement(by.id('loginErrorMessage')).isDisplayed())
            })
        });
    })
})