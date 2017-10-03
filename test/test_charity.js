var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var testData = require('mocha-testdata');
var given = testData.given;

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

contract('Charity', function(accounts) {

  var validOwner = accounts[0];
  var validTimes = generateTimes(5);
  var validCharity = accounts[1];

  it("should set the validOwner to us", async function() {
    var instance = await Charity.new();
    var actualOwner = await instance.owner.call();
    assert.equal(actualOwner, validOwner, "Owner wasn't us");
  });

  it("should start properly", async function() {

    var instance = await Charity.new();

    var actualWinner = await instance.winner.call({from: validOwner});
    assert.equal(actualWinner, 0, "winner zero");
    var actualCancelled = await instance.cancelled.call({from: validOwner});
    assert.isOk(actualCancelled, "initially cancelled");
    var actualTotalEntries = await instance.totalEntries.call({from: validOwner});
    assert.equal(actualTotalEntries, 0, "total entries zero");
    var actualTotalRevealed = await instance.totalRevealed.call({from: validOwner});
    assert.equal(actualTotalRevealed, 0, "total revealed zero");
    var actualTotalParticipants = await instance.totalParticipants.call({from: validOwner});
    assert.equal(actualTotalParticipants, 0, "total participants zero");
    var actualTotalRevealers = await instance.totalRevealers.call({from: validOwner});
    assert.equal(actualTotalRevealers, 0, "total revealers zero");
    
    var charitySplit = 49;
    var winnerSplit = 49;
    var validOwnerSplit = 2;
    var weiPerEntry = 1000;
    await instance.start(
      validCharity,
      charitySplit,
      winnerSplit,
      validOwnerSplit,
      weiPerEntry, 
      validTimes[0],
      validTimes[1],
      validTimes[2]);

    var actualCharity = await instance.charity.call({from: validOwner});
    assert.equal(actualCharity, validCharity, "charity does not match");
    var actualCharitySplit = await instance.charitySplit.call({from: validOwner});
    assert.equal(actualCharitySplit, charitySplit, "charity split does not match");
    var actualWinnerSplit = await instance.winnerSplit.call({from: validOwner});
    assert.equal(actualWinnerSplit, winnerSplit, "winner split does not match");
    var actualOwnerSplit = await instance.ownerSplit.call({from: validOwner});
    assert.equal(actualOwnerSplit, validOwnerSplit, "validOwner split does not match");
    var actualWeiPerEntry = await instance.weiPerEntry.call({from: validOwner});
    assert.equal(actualWeiPerEntry, weiPerEntry, "wei per entry does not match");
    var actualStartTime = await instance.startTime.call({from: validOwner});
    assert.equal(actualStartTime, validTimes[0], "start time does not match");
    var actualRevealTime = await instance.revealTime.call({from: validOwner});
    assert.equal(actualRevealTime, validTimes[1], "reveal time does not match");
    var actualEndTime = await instance.endTime.call({from: validOwner});
    assert.equal(actualEndTime, validTimes[2], "end time does not match");

  });

  given(
    [ 0, 49, 49, 2, 1000, validTimes[0], validTimes[1], validTimes[2] ],
    [ validCharity, 0, 49, 2, 1000, validTimes[0], validTimes[1], validTimes[2] ],
    [ validCharity, 49, 0, 2, 1000, validTimes[0], validTimes[1], validTimes[2] ],
    [ validCharity, 49, 49, 0, 1000, validTimes[0], validTimes[1], validTimes[2] ],
    [ validCharity, 49, 49, 2, 0, validTimes[0], validTimes[1], validTimes[2] ],
    [ validCharity, 49, 49, 2, 1000, 0, validTimes[1], validTimes[2] ],
    [ validCharity, 49, 49, 2, 1000, validTimes[0], 0, validTimes[2] ],
    [ validCharity, 49, 49, 2, 1000, validTimes[0], validTimes[1], 0 ]
  ).it("should fail to start with completely invalid data", async (
    charity, charitySplit, winnerSplit, validOwnerSplit, weiPerEntry, startTime, revealTime, endTime
  ) => {
    var instance = await Charity.new();
    return assert.isRejected(instance.start(
      charity,
      charitySplit,
      winnerSplit,
      validOwnerSplit,
      weiPerEntry,
      startTime,
      revealTime,
      endTime,
      {from: validOwner}
    ));
  });

});