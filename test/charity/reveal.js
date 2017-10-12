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
    var validCharityHashedRandom = helpers.hashedRandom(validCharityRandom, validCharity);

    it("should allow revelation after participation", async () => {

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

        await instance.seed(validCharityHashedRandom, { from: validCharity });

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

        await helpers.sleep(helpers.timeInterval);

        await instance.reveal(
            validRandom,
            { from: validParticipant }
        );

        var actualParticipant = await instance.participant.call(validParticipant, { from: validParticipant });
        var actualEntries = actualParticipant[0];
        var actualHashedRandom = actualParticipant[1];
        var actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 10, "entries should be 10");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(helpers.hexBigNumber(actualRandom), validRandom, "randoms should match");

        actualTotalEntries = await instance.totalEntries.call();
        actualTotalRevealed = await instance.totalRevealed.call();
        actualTotalParticipants = await instance.totalParticipants.call();
        actualTotalRevealers = await instance.totalRevealers.call();

        assert.equal(actualTotalEntries.toNumber(), 10, "total entries incorrect");
        assert.equal(actualTotalRevealed.toNumber(), 10, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 1, "total participants should be 1");
        assert.equal(actualTotalRevealers.toNumber(), 1, "total revealers not zero");

    });

    it("should reject random revelations too low", async () => {

        var validRandom = helpers.random(8);
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

        await instance.seed(validCharityHashedRandom, { from: validCharity });

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

    it("should reject multiple revelations from same address", async () => {
        
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

        await instance.seed(validCharityHashedRandom, { from: validCharity });

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

    it("should reject revelations without funding", async () => {
        
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

        await instance.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        await instance.participate(
            validHashedRandom,
            { from: validParticipant }
        );

        await helpers.sleep(helpers.timeInterval);

        assert.isRejected(instance.reveal(
            validRandom,
            { from: validParticipant }
        ));

    });

    it("should reject revelations before start", async () => {
        
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


        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        assert.isRejected(instance.participate(
            validHashedRandom,
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

        await instance.seed(validCharityHashedRandom, { from: validCharity });

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

        await instance.seed(validCharityHashedRandom, { from: validCharity });

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

        await instance.seed(validCharityHashedRandom, { from: validCharity });

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
