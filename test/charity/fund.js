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
    var validParticipant3 = accounts[4];
    var validParticipant4 = accounts[5];
    var validCharitySplit = 49;
    var validWinnerSplit = 49;
    var validOwnerSplit = 2;
    var validValuePerEntry = 1000;

    var validCharityRandom = helpers.random();
    var validCharityHashedRandom = helpers.hashedRandom(validCharityRandom, validParticipant);

    it("should allow funding after participation after start", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        await instance.construct(
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

        await instance.start(validCharityHashedRandom, { from: validCharity });

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

        assert.equal(actualTotalEntries.toNumber(), 10, "total entries incorrect");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 1, "total participants should be 1");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

        var actualParticipant = await instance.participant.call(validParticipant, { from: validParticipant });
        var actualEntries = actualParticipant[0];
        var actualHashedRandom = actualParticipant[1];
        var actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 10, "expected entries does not match");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(actualRandom.toNumber(), 0, "random should be zero");

        var actualBalance = await instance.balance.call(validParticipant, { from: validParticipant });
        assert.equal(actualBalance.toNumber(), 0, "balance should be zero");

    });

    it("should reject funding without participation after start", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        await instance.construct(
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

        await instance.start(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        // run fallback function
        assert.isRejected(instance.sendTransaction({ from: validParticipant, value: 10000 }));

        var actualTotalEntries = await instance.totalEntries.call();
        var actualTotalRevealed = await instance.totalRevealed.call();
        var actualTotalParticipants = await instance.totalParticipants.call();
        var actualTotalRevealers = await instance.totalRevealers.call();

        assert.equal(actualTotalEntries.toNumber(), 0, "total entries not zero");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 0, "total participants should be zero");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

    });

    it("should refund wei if partial entry value sent after participation", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        await instance.construct(
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

        await instance.start(validCharityHashedRandom, { from: validCharity });

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
        var actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 10, "expected entries does not match");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(actualRandom.toNumber(), 0, "random should be zero");

        var actualBalance = await instance.balance.call(validParticipant, { from: validParticipant });
        assert.equal(actualBalance.toNumber(), 500, "balance should be 500");

    });

    it("should reject funding with no value after participation", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        await instance.construct(
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

        await instance.start(validCharityHashedRandom, { from: validCharity });

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

        assert.equal(actualTotalEntries.toNumber(), 0, "total entries not zero");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 1, "total participants should be one");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

    });

}
