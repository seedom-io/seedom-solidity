var assert = chai.assert;

var Charity = artifacts.require("./charity.sol");

function timestamp(date) {
  return Math.floor(date / 1000);
}

function generateTimes(interval) {

  var startDate = new Date();
  startDate.setSeconds(startDate.getSeconds() + interval);
  var revealDate = new Date();
  revealDate.setSeconds(startDate.getSeconds() + interval);
  var endDate = new Date();
  endDate.setSeconds(revealDate.getSeconds() + interval);

  return [
    timestamp(startDate),
    timestamp(revealDate),
    timestamp(endDate)
  ];

}

function assertException(error) {
  if (error.message.search('invalid opcode') == -1) {
    assert.equal(error.message.search('assert.fail'), -1, error.actual);
  } else {
    assert.isOk(true, "valid exception");
  }
}

contract('Charity', function(accounts) {

  it("should set the owner to us", async function() {
    var instance = await Charity.deployed();
    var actualOwner = await instance.owner.call();
    assert.equal(actualOwner, accounts[0], "Owner wasn't us");
  });

  /*it("should start properly", async function() {

    var owner = accounts[0];
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
    
    var charity = accounts[1];
    var charitySplit = 49;
    var winnerSplit = 49;
    var ownerSplit = 2;
    var weiPerEntry = 1000;
    var times = generateTimes(5);
    await instance.start(
      charity,
      charitySplit,
      winnerSplit,
      ownerSplit,
      weiPerEntry, 
      times[0],
      times[1],
      times[2]);

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
    assert.equal(times[0], actualStartTime, "start time does not match");
    var actualRevealTime = await instance.revealTime.call({from: owner});
    assert.equal(times[1], actualRevealTime, "reveal time does not match");
    var actualEndTime = await instance.endTime.call({from: owner});
    assert.equal(times[2], actualEndTime, "end time does not match");

  });*/

  it("should fail to start with completely invalid data", async function() {

    var times = generateTimes(5);
    var charity = accounts[1];
    var startData = [
      [ 0, 49, 49, 2, 1000, times[0], times[1], times[2] ],
      [ charity, 0, 49, 2, 1000, times[0], times[1], times[2] ],
      [ charity, 49, 0, 2, 1000, times[0], times[1], times[2] ],
      [ charity, 49, 49, 0, 1000, times[0], times[1], times[2] ],
      [ charity, 49, 49, 2, 0, times[0], times[1], times[2] ],
      [ charity, 49, 49, 2, 1000, 0, times[1], times[2] ],
      [ charity, 49, 49, 2, 1000, times[0], 0, times[2] ],
      [ charity, 49, 49, 2, 1000, times[0], times[1], 0 ]
    ];
    
    return startData.forEach(async function(args) {

      var instance = await Charity.new();

      try {
        await instance.start(
          args[0],
          args[1],
          args[2],
          args[3],
          args[4],
          args[5],
          args[6],
          args[7]);
        assert.fail("start args should have failed: " + args);
      } catch (error) {
        assertException(error);
      }

    });

  });

});