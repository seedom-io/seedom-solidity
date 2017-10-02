var Charity = artifacts.require("./charity.sol");

contract('Charity', function(accounts) {

  it("should set the owner to us", function() {
    return Charity.deployed().then(function(instance) {
      return instance.owner.call();
    }).then(function(owner) {
      assert.equal(owner, accounts[0], "Owner wasn't us");
    });
  });

  it("should start properly", function() {

    var owner = accounts[0];
    var charity = accounts[1];
    var charitySplit = 49;
    var winnerSplit = 49;
    var ownerSplit = 2;
    var weiPerEntry = 1000;
    var that;

    return Charity.deployed().then(function(instance) {

      that = instance;

      var startTime = new Date();
      startTime.setSeconds(startTime.getSeconds() + 5);
      var revealTime = new Date();
      revealTime.setSeconds(startTime.getSeconds() + 5);
      var endTime = new Date();
      endTime.setSeconds(revealTime.getSeconds() + 5);

      return instance.start(
        charity,
        charitySplit,
        winnerSplit,
        ownerSplit,
        weiPerEntry,
        Math.floor(startTime / 1000),
        Math.floor(revealTime / 1000),
        Math.floor(endTime / 1000),
        {from: owner}
      );
      
    }).then(function() {
      return that.charity.call({from: owner});
    }).then(function(actualCharity) {
      assert.equal(charity, actualCharity, "charities do not match");
    });
  });
});