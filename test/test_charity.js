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

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function hashedRandom(random) {
  var hasher = new sha3.SHA3Hash(256);
  hasher.update(random.toString());
  var hashedRandomString = "0x" + hasher.digest('hex');
  return hashedRandomString.valueOf();
}

contract('Charity', function(accounts) {

  var validOwner = accounts[0];

  it("should set the validOwner to us", async () => {
    var instance = await Charity.new();
    var actualOwner = await instance.owner.call({from: validOwner});
    assert.equal(actualOwner, validOwner, "Owner wasn't us");
  });

  var timeInterval = 2;

  var validCharity = accounts[1];
  var validParticipant = accounts[2];
  var validParticipant2 = accounts[3];
  var validCharitySplit = 49;
  var validWinnerSplit = 49;
  var validOwnerSplit = 2;
  var validValuePerEntry = 1000;

  it("should start properly", async () => {

    var validStartTime = now() + timeInterval;
    var validRevealTime = validStartTime + timeInterval;
    var validEndTime = validRevealTime + timeInterval;

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
      validValuePerEntry, 
      validStartTime,
      validRevealTime,
      validEndTime,
      {from: validOwner}
    );

    var actualCharity = await instance.charity.call({from: validOwner});
    var actualCharitySplit = await instance.charitySplit.call({from: validOwner});
    var actualWinnerSplit = await instance.winnerSplit.call({from: validOwner});
    var actualOwnerSplit = await instance.ownerSplit.call({from: validOwner});
    var actualValuePerEntry = await instance.valuePerEntry.call({from: validOwner});
    var actualStartTime = await instance.startTime.call({from: validOwner});
    var actualRevealTime = await instance.revealTime.call({from: validOwner});
    var actualEndTime = await instance.endTime.call({from: validOwner});

    assert.equal(actualCharity, validCharity, "charity does not match");
    assert.equal(actualCharitySplit, validCharitySplit, "charity split does not match");
    assert.equal(actualWinnerSplit, validWinnerSplit, "winner split does not match");
    assert.equal(actualOwnerSplit, validOwnerSplit, "validOwner split does not match");
    assert.equal(actualValuePerEntry, validValuePerEntry, "wei per entry does not match");
    assert.equal(actualStartTime, validStartTime, "start time does not match");
    assert.equal(actualRevealTime, validRevealTime, "reveal time does not match");
    assert.equal(actualEndTime, validEndTime, "end time does not match");

  });

  var validStartTime = now() + timeInterval;
  var validRevealTime = validStartTime + timeInterval;
  var validEndTime = validRevealTime + timeInterval;

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
    charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, startTime, revealTime, endTime
  ) => {

    var instance = await Charity.new();

    assert.isRejected(instance.start(
      charity,
      charitySplit,
      winnerSplit,
      ownerSplit,
      valuePerEntry,
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
    charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, startTime, revealTime, endTime
  ) => {
    
    var instance = await Charity.new();

    assert.isRejected(instance.start(
      charity,
      charitySplit,
      winnerSplit,
      ownerSplit,
      valuePerEntry,
      startTime,
      revealTime,
      endTime,
      {from: validOwner}
    ));

  });

  it("should accept two participants properly after start", async () => {
  
    var validRandom = random(0, 1000000);
    var validHashedRandom = hashedRandom(validRandom);
    var validRandom2 = validRandom + 1;
    var validHashedRandom2 = hashedRandom(validRandom2);

    var validStartTime = now() + timeInterval;
    var validRevealTime = validStartTime + timeInterval;
    var validEndTime = validRevealTime + timeInterval;

    var instance = await Charity.new();

    await instance.start(
      validCharity,
      validCharitySplit,
      validWinnerSplit,
      validOwnerSplit,
      validValuePerEntry,
      validStartTime,
      validRevealTime,
      validEndTime,
      {from: validOwner}
    );

    // wait for charity to start
    await sleep(timeInterval + 1);

    await instance.participate(
      validHashedRandom,
      {from: validParticipant}
    );

    var actualParticipant = await instance.participant.call(validParticipant, {from: validParticipant});
    var actualEntries = actualParticipant[0];
    var actualHashedRandom = actualParticipant[1];
    var actualRefund = actualParticipant[2];
  
    assert.equal(actualEntries, 0, "entries should be zero");
    assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
    assert.equal(actualRefund, 0, "refund should be zero");

    var actualTotalEntries = await instance.totalEntries.call();
    var actualTotalRevealed = await instance.totalRevealed.call();
    var actualTotalParticipants = await instance.totalParticipants.call();
    var actualTotalRevealers = await instance.totalRevealers.call();

    assert.equal(actualTotalEntries, 0, "total entries should be zero");
    assert.equal(actualTotalRevealed, 0, "total revealed not zero");
    assert.equal(actualTotalParticipants, 1, "total participants should be 1");
    assert.equal(actualTotalRevealed, 0, "total revealers not zero");

    await instance.participate(
      validHashedRandom2,
      {from: validParticipant2}
    );

    actualParticipant = await instance.participant.call(validParticipant2, {from: validParticipant2});
    actualEntries = actualParticipant[0];
    actualHashedRandom = actualParticipant[1];
    actualRefund = actualParticipant[2];
  
    assert.equal(actualEntries, 0, "entries should be zero");
    assert.equal(actualHashedRandom, validHashedRandom2, "hashed random does not match");
    assert.equal(actualRefund, 0, "refund should be zero");

    actualTotalEntries = await instance.totalEntries.call();
    actualTotalRevealed = await instance.totalRevealed.call();
    actualTotalParticipants = await instance.totalParticipants.call();
    actualTotalRevealers = await instance.totalRevealers.call();

    assert.equal(actualTotalEntries, 0, "total entries should be zero");
    assert.equal(actualTotalRevealed, 0, "total revealed not zero");
    assert.equal(actualTotalParticipants, 2, "total participants should be 2");
    assert.equal(actualTotalRevealed, 0, "total revealers not zero");

  });

  it("should reject participation of bad hashed randoms after start", async () => {
  
    var validStartTime = now() + timeInterval;
    var validRevealTime = validStartTime + timeInterval;
    var validEndTime = validRevealTime + timeInterval;

    var instance = await Charity.new();

    await instance.start(
      validCharity,
      validCharitySplit,
      validWinnerSplit,
      validOwnerSplit,
      validValuePerEntry,
      validStartTime,
      validRevealTime,
      validEndTime,
      {from: validOwner}
    );

    // wait for charity to start
    await sleep(timeInterval);

    assert.isRejected(instance.participate(0, {from: validParticipant}));

    var actualParticipant = await instance.participant.call(validParticipant, {from: validParticipant});
    var actualEntries = actualParticipant[0];
    var actualHashedRandom = actualParticipant[1];
    var actualRefund = actualParticipant[2];

    assert.equal(actualEntries, 0, "entries should be zero");
    assert.equal(actualHashedRandom, 0, "hashed random should be zero");
    assert.equal(actualRefund, 0, "refund should be zero");

    var actualTotalEntries = await instance.totalEntries.call();
    var actualTotalRevealed = await instance.totalRevealed.call();
    var actualTotalParticipants = await instance.totalParticipants.call();
    var actualTotalRevealers = await instance.totalRevealers.call();

    assert.equal(actualTotalEntries, 0, "total entries should be zero");
    assert.equal(actualTotalRevealed, 0, "total revealed not zero");
    assert.equal(actualTotalParticipants, 0, "total participants should be zero");
    assert.equal(actualTotalRevealed, 0, "total revealers not zero");
  
  });

  it("should allow funding after participation after start", async () => {
    
      var validRandom = random(0, 1000000);
      var validHashedRandom = hashedRandom(validRandom);
  
      var validStartTime = now() + timeInterval;
      var validRevealTime = validStartTime + timeInterval;
      var validEndTime = validRevealTime + timeInterval;
  
      var instance = await Charity.new();
  
      await instance.start(
        validCharity,
        validCharitySplit,
        validWinnerSplit,
        validOwnerSplit,
        validValuePerEntry,
        validStartTime,
        validRevealTime,
        validEndTime,
        {from: validOwner}
      );
  
      // wait for charity to start
      await sleep(timeInterval + 1);
  
      await instance.participate(
        validHashedRandom,
        {from: validParticipant}
      );

      // run fallback function
      await instance.sendTransaction({from: validParticipant, value: 10000});
  
      var actualTotalEntries = await instance.totalEntries.call();
      var actualTotalRevealed = await instance.totalRevealed.call();
      var actualTotalParticipants = await instance.totalParticipants.call();
      var actualTotalRevealers = await instance.totalRevealers.call();
  
      assert.equal(actualTotalEntries, 10, "total entries incorrect");
      assert.equal(actualTotalRevealed, 0, "total revealed not zero");
      assert.equal(actualTotalParticipants, 1, "total participants should be 1");
      assert.equal(actualTotalRevealed, 0, "total revealers not zero");
  
    });

  it("should reject funding without participation after start", async () => {
    
      var validRandom = random(0, 1000000);
      var validHashedRandom = hashedRandom(validRandom);
  
      var validStartTime = now() + timeInterval;
      var validRevealTime = validStartTime + timeInterval;
      var validEndTime = validRevealTime + timeInterval;
  
      var instance = await Charity.new();
  
      await instance.start(
        validCharity,
        validCharitySplit,
        validWinnerSplit,
        validOwnerSplit,
        validValuePerEntry,
        validStartTime,
        validRevealTime,
        validEndTime,
        {from: validOwner}
      );
  
      // wait for charity to start
      await sleep(timeInterval + 1);

      // run fallback function
      assert.isRejected(instance.sendTransaction({from: validParticipant, value: 10000}));
  
      var actualTotalEntries = await instance.totalEntries.call();
      var actualTotalRevealed = await instance.totalRevealed.call();
      var actualTotalParticipants = await instance.totalParticipants.call();
      var actualTotalRevealers = await instance.totalRevealers.call();
  
      assert.equal(actualTotalEntries, 0, "total entries not zero");
      assert.equal(actualTotalRevealed, 0, "total revealed not zero");
      assert.equal(actualTotalParticipants, 0, "total participants should be zero");
      assert.equal(actualTotalRevealed, 0, "total revealers not zero");
  
    });

  it("should refund wei if partial entry value sent after participation", async () => {

    var validRandom = random(0, 1000000);
    var validHashedRandom = hashedRandom(validRandom);

    var validStartTime = now() + timeInterval;
    var validRevealTime = validStartTime + timeInterval;
    var validEndTime = validRevealTime + timeInterval;

    var instance = await Charity.new();

    await instance.start(
      validCharity,
      validCharitySplit,
      validWinnerSplit,
      validOwnerSplit,
      validValuePerEntry,
      validStartTime,
      validRevealTime,
      validEndTime,
      {from: validOwner}
    );

    // wait for charity to start
    await sleep(timeInterval + 1);

    await instance.participate(
      validHashedRandom,
      {from: validParticipant}
    );

    // run fallback function
    await instance.sendTransaction({from: validParticipant, value: 10500});

    var actualParticipant = await instance.participant.call(validParticipant, {from: validParticipant});
    var actualEntries = actualParticipant[0];
    var actualHashedRandom = actualParticipant[1];
    var actualRefund = actualParticipant[2];

    assert.equal(actualEntries, 10, "expected entries does not match");
    assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
    assert.equal(actualRefund, 500, "refund does not match");

  });

  it("should fail owner participation", async () => {

    var validRandom = random(0, 1000000);
    var validHashedRandom = hashedRandom(validRandom);

    var validStartTime = now() + timeInterval;
    var validRevealTime = validStartTime + timeInterval;
    var validEndTime = validRevealTime + timeInterval;

    var instance = await Charity.new();

    await instance.start(
      validCharity,
      validCharitySplit,
      validWinnerSplit,
      validOwnerSplit,
      validValuePerEntry,
      validStartTime,
      validRevealTime,
      validEndTime,
      {from: validOwner}
    );

    // wait for charity to start
    await sleep(timeInterval + 1);

    assert.isRejected(instance.participate(
      validHashedRandom,
      {from: validOwner}
    ));

  });

  it("should fail participation without start", async () => {
    
    var validRandom = random(0, 1000000);
    var validHashedRandom = hashedRandom(validRandom);

    var instance = await Charity.new();

    assert.isRejected(instance.participate(
      validHashedRandom,
      {from: validParticipant}
    ));

  });

});