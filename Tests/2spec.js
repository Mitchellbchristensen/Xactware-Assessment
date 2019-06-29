// 2spec.js
describe('UofU Homepage', function () {
    var Lf = element(by.model('login'));
    var Pf = element(by.model('password'));
    var Lb = element(by.css('Log In to MyChart'));

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/');
    });

    //it('Main site has a title (Should succeed)', function () {
    //    expect(browser.getTitle()).toEqual('University of Utah Health | University of Utah Health');
    //});

    //it('Fail login', function () {
    //    element(by.id('Login')).sendKeys('MitchellC');
    //    element(by.id('password')).sendKeys('Timp1234');
    //    element(by.css('[value="Log In to MyChart"]')).click();
    //    browser.sleep(1000000);
    //    browser.pause();
    //    browser.debugger();
      //  expect(by.binding('Login unsuccessful'))

    it('Click on my chart FAQ link', function () {
        element(by.css('[value="Learn more about MyChart."]')).click();
    });
});



//Tools
// element(by.id('nameID)).sendKeys(name)

// element(by.id('submintbtn')).click()

// expect (element(by.id('welcomText')).getText()).toEqual('Welcom to Protractor' = name = '!')


    //it('should add four and six', function () {
    //    // Fill this in.
    //    expect(latestResult.getText()).toEqual('10');
    //});

    //it('should read the value from an input', function () {
    //    firstNumber.sendKeys(1);
    //    expect(firstNumber.getAttribute('value')).toEqual('1');
    //});
//});