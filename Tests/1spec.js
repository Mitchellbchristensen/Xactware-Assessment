 //1spec.js
describe('UofU Health homepage', function () {
    var username = element(by.id('Login'));
    var password = element(by.id('password'));
    var login = element(by.buttonText('Log In to MyChart'));

    beforeEach(function () {
        browser.get('');
    });

    it('Main site has a title (Should succeed)', function () {
        expect(browser.getTitle()).toEqual('University of Utah Health | University of Utah Health');
    });

    it('Login button redirects to MyChart', function () {
        login.click();
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
        username.sendKeys(browser.params.login.user);
        password.sendKeys(browser.params.login.password);
        login.click();
        browser.getAllWindowHandles().then(function (handles) {
            newWindowHandle = handles[1];
            browser.switchTo().window(newWindowHandle).then(function () {
                expect(browser.driver.findElement(by.id('loginErrorMessage')).isDisplayed())
            })
        });
    })

    // 'Test each header link'
    // Find the list of header elements (It is an odd list of classes)
    // Click on the first link (Then do this for each consecutive link)
    // Expect that the url and page title change

    // 'Search for a keyterm'
    // Find the element for the search icon, click
    // Find the element for the search field, send keys 
    // Click Enter/search icon
    // Verify that the user is taken to valid search results (This will be tricky because they have 4 different sections of results)

    // 'Search for a keyterm and use the predictive result feature'
    // Find the element for the search icon, click
    // Find the element for the search field, send keys ('a') 
    // Find and click on an element in the results
    // Expect that the user is taken to a specific page

    // 'Search for an invalid search term that shows no results'
    // Find the element for the search icon, click
    // Find the element for the search field, send keys ('asdf') 
    // Find and click on an element in the results
    // Expect that a message would show stating that there were no results

    // 'Follow Slider links' (Although this test might change often I feel it is important to test)
    // Find the list of elements in the slider 
    // Define how many items there are
    // Find links in each and click
    // Expect that the user is taken to a specific page

    // 'Slider links should cycle through list of options'
    // Find the list of elements in the slider 
    // Acknowledge which slider image is currently showing
    // Click the right arrow or wait for the designated amount of time (2 tests would be needed)
    // Expect that a different image would be showing
})