var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var helpers = require('../helpers');

module.exports = (artifact, accounts) => {

    var validOwner = accounts[0];

    it("should set the owner to us", async () => {
        var instance = await artifact.new();
        var actualOwner = await instance.owner.call({from: validOwner});
        assert.equal(actualOwner, validOwner, "Owner wasn't us");
    });

}
