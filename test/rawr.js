var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;

suite('testtest', (accounts) => {

    it("should seed properly from charity", async () => {
        console.log(accounts);
        assert.isOk(true);
    });

});