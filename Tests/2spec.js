// 2spec.js
describe('UofU Homepage', function () {
    var Lf = element(by.id('login'));
    var Pf = element(by.id('password'));
    var Lb = element(by.css('Log In to MyChart'));

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/');
    });

    it('Fail login', async function () {
        debugger;
        await element(by.id('Login')).sendKeys(params.login.user);
        await element(by.id('password')).sendKeys(params.login.password);
        await element(by.binding('Log In to MyChart')).click();
    //    browser.sleep(1000000);
    //    browser.pause();
    //    browser.debugger();
      //  expect(by.binding('Login unsuccessful'))

    //it('Click on my chart FAQ link', function () {
    //    element(by.binading('Learn more about MyChart')).click();
    //});
});


    //it('Fail login', function () {
    //    element(by.id('Login')).sendKeys('MitchellC');
    //    element(by.id('password')).sendKeys('Timp1234');
    //    element(by.binding('Log In to MyChart')).click();
    //    browser.sleep(1000000);
    //    browser.pause();
    //    browser.debugger();
      //  expect(by.binding('Login unsuccessful'))

    //it('Click on my chart FAQ link', function () {
    //    element(by.binading('Learn more about MyChart')).click();
    //});

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


//describe('literally describe what you are testing(login page)bbbbbbbbbbbbb', function () {
//    it('what is the specific test doing(it should when)3333333333333333333', function () {
//        browser.get('https://healthcare.utah.edu/');
//        element(by.classname('js-search-buttona')).click();
//        console.log(element(by.id('mainsearchmodal')));
//        expect(element(by.id('mainsearchmodal'))).tobedefined();
//        expect(true).tobetruthy();
//    });
//    it('what is the specific test doing(it should when)44444444444444444', function () {
//        browser.get('https://healthcare.utah.edu/');
//        element(by.classname('js-search-buttona')).click();
//        console.log(element(by.id('mainsearchmodal')));
//        expect(element(by.id('mainsearchmodal'))).tobedefined();
//       expect(true).tobetruthy();
//    });
//});


//Tools
// element(by.id('nameID)).sendKeys(name)

// element(by.id('submintbtn')).click()

// expect (element(by.id('welcomText')).getText()).toEqual('Welcom to Protractor' = name = '!')

// var name = 'name a thing for easy access'

        //it('Fail login', function () {
    //    browser.get('https://healthcare.utah.edu/');
    //    element(by.id('Login')).sendKeys('MitchellC');
    //    element(by.id('password')).sendKeys('Timp1234');
    //    element(by.binding('Log In to MyChart')).click();
    //    expect(by.binding('Login unsuccessful'))
    //});