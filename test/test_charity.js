var Charity = artifacts.require("./charity.sol");

contract('Charity', function(accounts) {
  it("Should set the owner to us", function() {
    return Charity.deployed().then(function(instance) {
      return instance.getOwner.call();
    }).then(function(owner) {
      assert.equal(owner, accounts[0], "Owner wasn't us");
    });
  });
});