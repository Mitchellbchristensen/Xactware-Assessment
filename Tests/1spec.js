 //1spec.js
describe('UofU Homepage', function () {
    var firstNumber = element(by.model('first'));
    var secondNumber = element(by.model('second'));
    var goButton = element(by.id('gobutton'));
    var latestResult = element(by.binding('latest'));

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/');
    });

    it('Main site has a title (Should succeed)', function () {
        expect(browser.getTitle()).toEqual('University of Utah Health | University of Utah Health');
    });
    //it('Fail login', function () {
    //    browser.get('https://healthcare.utah.edu/');
    //    element(by.id('Login')).sendKeys('MitchellC');
    //    element(by.id('password')).sendKeys('Timp1234');
    //    element(by.css('[value="Log In to MyChart"]')).click();
    //    expect(by.binding('Login unsuccessful'))
    //});
});

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