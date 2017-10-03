var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var testData = require('mocha-testdata');
var given = testData.given;
var sha3 = require('sha3');

var Charity = artifacts.require("./charity.sol");

function now() {
  return Math.round((new Date()).getTime() / 1000);
}

function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

contract('Charity', function(accounts) {

  var validOwner = accounts[0];
  var validCharity = accounts[1];
  var validParticipant = accounts[2];
  var validCharitySplit = 49;
  var validWinnerSplit = 49;
  var validOwnerSplit = 2;
  var validWeiPerEntry = 1000;

  var timeInterval = 5;

  var validStartTime = now() + timeInterval;
  var validRevealTime = validStartTime + timeInterval;
  var validEndTime = validRevealTime + timeInterval;

  it("should set the validOwner to us", async () => {
    var instance = await Charity.new();
    var actualOwner = await instance.owner.call({from: validOwner});
    assert.equal(actualOwner, validOwner, "Owner wasn't us");
  });

  it("should start properly", async () => {

    var instance = await Charity.new();
    var actualWinner = await instance.winner.call({from: validOwner});
    var actualCancelled = await instance.cancelled.call({from: validOwner});
    var actualTotalEntries = await instance.totalEntries.call({from: validOwner});
    var actualTotalRevealed = await instance.totalRevealed.call({from: validOwner});
    var actualTotalParticipants = await instance.totalParticipants.call({from: validOwner});
    var actualTotalRevealers = await instance.totalRevealers.call({from: validOwner});

    assert.equal(actualWinner, 0, "winner zero");
    assert.isOk(actualCancelled, "initially cancelled");
    assert.equal(actualTotalEntries, 0, "total entries zero");
    assert.equal(actualTotalRevealed, 0, "total revealed zero");
    assert.equal(actualTotalParticipants, 0, "total participants zero");
    assert.equal(actualTotalRevealers, 0, "total revealers zero");
    
    await instance.start(
      validCharity,
      validCharitySplit,
      validWinnerSplit,
      validOwnerSplit,
      validWeiPerEntry, 
      validStartTime,
      validRevealTime,
      validEndTime,
      {from: validOwner}
    );

    var actualCharity = await instance.charity.call({from: validOwner});
    var actualCharitySplit = await instance.charitySplit.call({from: validOwner});
    var actualWinnerSplit = await instance.winnerSplit.call({from: validOwner});
    var actualOwnerSplit = await instance.ownerSplit.call({from: validOwner});
    var actualWeiPerEntry = await instance.weiPerEntry.call({from: validOwner});
    var actualStartTime = await instance.startTime.call({from: validOwner});
    var actualRevealTime = await instance.revealTime.call({from: validOwner});
    var actualEndTime = await instance.endTime.call({from: validOwner});

    assert.equal(actualCharity, validCharity, "charity does not match");
    assert.equal(actualCharitySplit, validCharitySplit, "charity split does not match");
    assert.equal(actualWinnerSplit, validWinnerSplit, "winner split does not match");
    assert.equal(actualOwnerSplit, validOwnerSplit, "validOwner split does not match");
    assert.equal(actualWeiPerEntry, validWeiPerEntry, "wei per entry does not match");
    assert.equal(actualStartTime, validStartTime, "start time does not match");
    assert.equal(actualRevealTime, validRevealTime, "reveal time does not match");
    assert.equal(actualEndTime, validEndTime, "end time does not match");

  });

  validStartTime = now() + timeInterval;
  validRevealTime = validStartTime + timeInterval;
  validEndTime = validRevealTime + timeInterval;

  given(
    [ 0, 49, 49, 2, 1000, validStartTime, validRevealTime, validEndTime ],
    [ validCharity, 0, 49, 2, 1000, validStartTime, validRevealTime, validEndTime ],
    [ validCharity, 49, 0, 2, 1000, validStartTime, validRevealTime, validEndTime ],
    [ validCharity, 49, 49, 0, 1000, validStartTime, validRevealTime, validEndTime ],
    [ validCharity, 49, 49, 2, 0, validStartTime, validRevealTime, validEndTime ],
    [ validCharity, 49, 49, 2, 1000, 0, validRevealTime, validEndTime ],
    [ validCharity, 49, 49, 2, 1000, validStartTime, 0, validEndTime ],
    [ validCharity, 49, 49, 2, 1000, validStartTime, validRevealTime, 0 ]
  ).it("should fail to start with completely invalid data", async (
    charity, charitySplit, winnerSplit, ownerSplit, weiPerEntry, startTime, revealTime, endTime
  ) => {
    var instance = await Charity.new();
    assert.isRejected(instance.start(
      charity,
      charitySplit,
      winnerSplit,
      ownerSplit,
      weiPerEntry,
      startTime,
      revealTime,
      endTime,
      {from: validOwner}
    ));
  });

  var oldStartTime = now() - (timeInterval * 3);
  var oldRevealTime = oldStartTime + timeInterval;
  var oldEndTime = oldRevealTime + timeInterval;

  given(
    // old dates
    [ validCharity, 49, 49, 2, 1000, oldStartTime, validRevealTime, validEndTime ],
    [ validCharity, 49, 49, 2, 1000, validStartTime, oldRevealTime, validEndTime ],
    [ validCharity, 49, 49, 2, 1000, validStartTime, validRevealTime, oldEndTime ],
    // equal dates
    [ validCharity, 49, 49, 2, 1000, validStartTime, validStartTime, validStartTime ],
    [ validCharity, 49, 49, 2, 1000, validStartTime, validStartTime, validEndTime ],
    [ validCharity, 49, 49, 2, 1000, validStartTime, validRevealTime, validRevealTime ],
    // out of order dates
    [ validCharity, 49, 49, 2, 1000, validRevealTime, validStartTime, validEndTime ],
    [ validCharity, 49, 49, 2, 1000, validStartTime, validEndTime, validRevealTime ]
  ).it("should fail to start with invalid dates", async (
    charity, charitySplit, winnerSplit, ownerSplit, weiPerEntry, startTime, revealTime, endTime
  ) => {
    var instance = await Charity.new();
    assert.isRejected(instance.start(
      charity,
      charitySplit,
      winnerSplit,
      ownerSplit,
      weiPerEntry,
      startTime,
      revealTime,
      endTime,
      {from: validOwner}
    ));
  });

  var validValue = 10000;
  var validHasher = new sha3.SHA3Hash(256);
  var validRandom = 123;
  validHasher.update(validRandom.toString());
  var validHashedRandomString = "0x" + validHasher.digest('hex');
  var validHashedRandom = validHashedRandomString.valueOf();
  var validEntries = validValue / validWeiPerEntry;

  validStartTime = now() + timeInterval;
  validRevealTime = validStartTime + timeInterval;
  validEndTime = validRevealTime + timeInterval;

  it("should participate properly", async () => {

    var instance = await Charity.new();

    await instance.start(
      validCharity,
      validCharitySplit,
      validWinnerSplit,
      validOwnerSplit,
      validWeiPerEntry,
      validStartTime,
      validRevealTime,
      validEndTime,
      {from: validOwner}
    );

    // wait for charity to start
    await sleep(timeInterval);

    await instance.participate(
      validHashedRandom,
      {from: validParticipant, value: validValue}
    );

    var actualParticipant = await instance.participant.call(validParticipant, {from: validParticipant});
    var actualEntries = actualParticipant[0];
    var actualHashedRandom = actualParticipant[1];

    assert.equal(actualEntries, validEntries, "expected entries does not match");
    assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");

  });

  /*it("should fail owner participation", async () => {
    var instance = await Charity.new();
    await instance.start(
      validCharity,
      validCharitySplit,
      validWinnerSplit,
      validOwnerSplit,
      validWeiPerEntry,
      validStartTime,
      validRevealTime,
      validEndTime,
      {from: validOwner}
    );
    assert.isRejected(instance.participate(
      validHashedRandom,
      {from: validOwner, value: validValue}
    ));
  });

  it("should fail participation without start", async () => {
    var instance = await Charity.new();
    assert.isRejected(instance.participate(
      validHashedRandom,
      {from: validParticipant, value: validValue}
    ));
  });*/

});