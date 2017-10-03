const assertJump = require('zeppelin-solidity/test/helpers/assertJump');

var Charity = artifacts.require("./charity.sol");

function timestamp(date) {
  return Math.floor(date / 1000);
}

contract('Charity', function(accounts) {

  it("should set the owner to us", async function() {
    var instance = await Charity.deployed();
    var actualOwner = await instance.owner.call();
    assert.equal(actualOwner, accounts[0], "Owner wasn't us");
  });

  it("should start properly", async function() {

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

    var instance = await Charity.deployed();

    var actualWinner = await instance.winner.call({from: owner});
    assert.equal(0, actualWinner, "winner zero");
    var actualCancelled = await instance.cancelled.call({from: owner});
    assert.isOk(actualCancelled, "initially cancelled");
    var actualTotalEntries = await instance.totalEntries.call({from: owner});
    assert.equal(0, actualTotalEntries, "total entries zero");
    var actualTotalRevealed = await instance.totalRevealed.call({from: owner});
    assert.equal(0, actualTotalRevealed, "total revealed zero");
    var actualTotalParticipants = await instance.totalParticipants.call({from: owner});
    assert.equal(0, actualTotalParticipants, "total participants zero");
    var actualTotalRevealers = await instance.totalRevealers.call({from: owner});
    assert.equal(0, actualTotalRevealers, "total revealers zero");
    
    await instance.start(
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

    var actualCharity = await instance.charity.call({from: owner});
    assert.equal(charity, actualCharity, "charity does not match");
    var actualCharitySplit = await instance.charitySplit.call({from: owner});
    assert.equal(charitySplit, actualCharitySplit, "charity split does not match");
    var actualWinnerSplit = await instance.winnerSplit.call({from: owner});
    assert.equal(winnerSplit, actualWinnerSplit, "winner split does not match");
    var actualOwnerSplit = await instance.ownerSplit.call({from: owner});
    assert.equal(ownerSplit, actualOwnerSplit, "owner split does not match");
    var actualWeiPerEntry = await instance.weiPerEntry.call({from: owner});
    assert.equal(weiPerEntry, actualWeiPerEntry, "wei per entry does not match");
    var actualStartTime = await instance.startTime.call({from: owner});
    assert.equal(startTime, actualStartTime, "start time does not match");
    var actualRevealTime = await instance.revealTime.call({from: owner});
    assert.equal(revealTime, actualRevealTime, "reveal time does not match");
    var actualEndTime = await instance.endTime.call({from: owner});
    assert.equal(endTime, actualEndTime, "end time does not match");

  });

  it("should fail to start with zero charity", async function() {

    var owner = accounts[0];
    var charity = 0;
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

    var instance = await Charity.deployed();
      
    try {
      await instance.start(
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
      assert.fail();
    } catch (error) {
      assertJump(error);
    }
  });
  
});