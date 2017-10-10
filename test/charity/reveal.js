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

    it("should allow revelation after start, funding, and participation", async () => {

        var validRandom = helpers.random();
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

        await helpers.sleep(helpers.timeInterval);

        await instance.reveal(
            validRandom,
            { from: validParticipant }
        );

        var actualRandom = await instance.revealer.call(validParticipant, { from: validParticipant });

        assert.equal(helpers.hexBigNumber(actualRandom), validRandom, "randoms should match");

        actualTotalEntries = await instance.totalEntries.call();
        actualTotalRevealed = await instance.totalRevealed.call();
        actualTotalParticipants = await instance.totalParticipants.call();
        actualTotalRevealers = await instance.totalRevealers.call();

        assert.equal(actualTotalEntries, 10, "total entries incorrect");
        assert.equal(actualTotalRevealed, 10, "total revealed not zero");
        assert.equal(actualTotalParticipants, 1, "total participants should be 1");
        assert.equal(actualTotalRevealers, 1, "total revealers not zero");

    });

    it("should reject random revelations too low", async () => {

        var validRandom = helpers.random(8);
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

        await helpers.sleep(helpers.timeInterval);

        assert.isRejected(instance.reveal(
            validRandom,
            { from: validParticipant }
        ));

    });

    it("should reject multiple revelations", async () => {
        
        var validRandom = helpers.random();
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

        await helpers.sleep(helpers.timeInterval);

        instance.reveal(
            validRandom,
            { from: validParticipant }
        );

        assert.isRejected(instance.reveal(
            validRandom,
            { from: validParticipant }
        ));

    });

    it("should reject owner revelations", async () => {
        
        var validRandom = helpers.random();
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

        await helpers.sleep(helpers.timeInterval);

        assert.isRejected(instance.reveal(
            validRandom,
            { from: validOwner }
        ));

    });

    it("should reject incorrect randoms", async () => {
        
        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);
        var invalidRandom = helpers.random();

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

        await helpers.sleep(helpers.timeInterval);

        assert.isRejected(instance.reveal(
            invalidRandom,
            { from: validParticipant }
        ));

    });

    it("should reject revelations before and after revelation period", async () => {
        
        var validRandom = helpers.random();
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

        assert.isRejected(instance.reveal(
            validRandom,
            { from: validParticipant }
        ));

        await helpers.sleep(helpers.timeInterval * 2);

        assert.isRejected(instance.reveal(
            validRandom,
            { from: validParticipant }
        ));

    });

}
