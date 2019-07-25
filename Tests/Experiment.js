 //experiment.js
describe('UofU Loginpage', function () {

    beforeEach(function () {
        browser.get('https://healthcare.utah.edu/');
    });

    it('Fail login', function () {
        element(by.id('Login')).sendKeys('MitchellC');
        element(by.id('password')).sendKeys('Timp1234');
        //var guru = element(by.xpath('/section/div/div/div[1]/div[1]/div/div[2]/form/button'));
            //element(guru.getText()).click();
        //setTimeout(function () { alert("Hello"); }, 30000);
        //browser.sleep(5000);
        //browser.getallwindowhandles().then(function (handles) {
        //    newwindowhandle = handles[1]; // this is your new window
            //browser.switchto().window(newwindowhandle).then(function () {
                //expect(browser.getcurrenturl()).tomatch('https://mychart.med.utah.edu/mychart/default.asp');
            //});
        //})
    })
});
