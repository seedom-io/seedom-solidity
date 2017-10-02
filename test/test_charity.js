var Charity = artifacts.require("./charity.sol");

function timestamp(date) {
  return Math.floor(date / 1000);
}

contract('Charity', function(accounts) {

  it("should set the owner to us", function() {
    return Charity.deployed().then(function(instance) {
      return instance.owner.call();
    }).then(function(owner) {
      assert.equal(owner, accounts[0], "Owner wasn't us");
    });
  });

  it("should start properly", function() {

    var that;

    var owner = accounts[0];
    var charity = accounts[1];
    var charitySplit = 49;
    var winnerSplit = 49;
    var ownerSplit = 2;
    var weiPerEntry = 1000;
    
    var startDate = new Date();
    startDate.setSeconds(startDate.getSeconds() + 5);
    var revealDate = new Date();
    revealDate.setSeconds(startDate.getSeconds() + 5);
    var endDate = new Date();
    endDate.setSeconds(revealDate.getSeconds() + 5);

    var startTime = timestamp(startDate);
    var revealTime = timestamp(revealDate);
    var endTime = timestamp(endDate);

    return Charity.deployed().then(function(instance) {

      that = instance;

      return instance.start(
        charity,
        charitySplit,
        winnerSplit,
        ownerSplit,
        weiPerEntry,
        startTime,
        revealTime,
        endTime,
        {from: owner}
      );
      
    }).then(function() {
      return that.charity.call({from: owner});
    }).then(function(actualCharity) {
      assert.equal(charity, actualCharity, "charity does not match");
    }).then(function() {
      return that.charitySplit.call({from: owner});
    }).then(function(actualCharitySplit) {
      assert.equal(charitySplit, actualCharitySplit, "charity split does not match");
    }).then(function() {
      return that.winnerSplit.call({from: owner});
    }).then(function(actualWinnerSplit) {
      assert.equal(winnerSplit, actualWinnerSplit, "winner split does not match");
    }).then(function() {
      return that.ownerSplit.call({from: owner});
    }).then(function(actualOwnerSplit) {
      assert.equal(ownerSplit, actualOwnerSplit, "owner split does not match");
    }).then(function() {
      return that.weiPerEntry.call({from: owner});
    }).then(function(actualWeiPerEntry) {
      assert.equal(weiPerEntry, actualWeiPerEntry, "wei per entry does not match");
    }).then(function() {
      return that.startTime.call({from: owner});
    }).then(function(actualStartTime) {
      assert.equal(startTime, actualStartTime, "start time does not match");
    }).then(function() {
      return that.revealTime.call({from: owner});
    }).then(function(actualRevealTime) {
      assert.equal(revealTime, actualRevealTime, "reveal time does not match");
    }).then(function() {
      return that.endTime.call({from: owner});
    }).then(function(actualEndTime) {
      assert.equal(endTime, actualEndTime, "end time does not match");
    });
  });
});