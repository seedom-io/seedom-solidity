var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var helpers = require('../helpers');

module.exports = (artifact, accounts) => {

    var validOwner = accounts[0];
    var validCharity = accounts[1];
    var validParticipant = accounts[2];
    var validParticipant2 = accounts[3];
    var validCharitySplit = 49;
    var validWinnerSplit = 49;
    var validOwnerSplit = 2;
    var validValuePerEntry = 1000;

    it("should allow funding after participation after start", async () => {

        var validRandom = helpers.random(0, 1000000);
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        await instance.start(
            validCharity,
            validCharitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        await instance.participate(
            validHashedRandom,
            { from: validParticipant }
        );

        // run fallback function
        await instance.sendTransaction({ from: validParticipant, value: 10000 });

        var actualTotalEntries = await instance.totalEntries.call();
        var actualTotalRevealed = await instance.totalRevealed.call();
        var actualTotalParticipants = await instance.totalParticipants.call();
        var actualTotalRevealers = await instance.totalRevealers.call();

        assert.equal(actualTotalEntries, 10, "total entries incorrect");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, 1, "total participants should be 1");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

        var actualParticipant = await instance.participant.call(validParticipant, { from: validParticipant });
        var actualEntries = actualParticipant[0];
        var actualHashedRandom = actualParticipant[1];
        var actualRefund = actualParticipant[2];

        assert.equal(actualEntries, 10, "expected entries does not match");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(actualRefund, 0, "refund should be zero");

    });

    it("should reject funding without participation after start", async () => {

        var validRandom = helpers.random(0, 1000000);
        var validHashedRandom = helpers.hashedRandom(validRandom);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        await instance.start(
            validCharity,
            validCharitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        // run fallback function
        assert.isRejected(instance.sendTransaction({ from: validParticipant, value: 10000 }));

        var actualTotalEntries = await instance.totalEntries.call();
        var actualTotalRevealed = await instance.totalRevealed.call();
        var actualTotalParticipants = await instance.totalParticipants.call();
        var actualTotalRevealers = await instance.totalRevealers.call();

        assert.equal(actualTotalEntries, 0, "total entries not zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, 0, "total participants should be zero");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });

    it("should refund wei if partial entry value sent after participation", async () => {

        var validRandom = helpers.random(0, 1000000);
        var validHashedRandom = helpers.hashedRandom(validRandom);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        await instance.start(
            validCharity,
            validCharitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        await instance.participate(
            validHashedRandom,
            { from: validParticipant }
        );

        // run fallback function
        await instance.sendTransaction({ from: validParticipant, value: 10500 });

        var actualParticipant = await instance.participant.call(validParticipant, { from: validParticipant });
        var actualEntries = actualParticipant[0];
        var actualHashedRandom = actualParticipant[1];
        var actualRefund = actualParticipant[2];

        assert.equal(actualEntries, 10, "expected entries does not match");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(actualRefund, 500, "refund does not match");

    });

    it("should reject funding with no value after participation", async () => {

        var validRandom = helpers.random(0, 1000000);
        var validHashedRandom = helpers.hashedRandom(validRandom);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        await instance.start(
            validCharity,
            validCharitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        await instance.participate(
            validHashedRandom,
            { from: validParticipant }
        );

        // run fallback function
        assert.isRejected(instance.sendTransaction({ from: validParticipant, value: 0 }));

        var actualTotalEntries = await instance.totalEntries.call();
        var actualTotalRevealed = await instance.totalRevealed.call();
        var actualTotalParticipants = await instance.totalParticipants.call();
        var actualTotalRevealers = await instance.totalRevealers.call();

        assert.equal(actualTotalEntries, 0, "total entries not zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, 1, "total participants should be one");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });

}
