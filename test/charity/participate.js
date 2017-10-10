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

    it("should accept two participants properly after start", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);
        var validRandom2 = validRandom + 1;
        var validHashedRandom2 = helpers.hashedRandom(validRandom2, validParticipant2);

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

        var actualParticipant = await instance.participant.call(validParticipant, { from: validParticipant });
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
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

        await instance.participate(
            validHashedRandom2,
            { from: validParticipant2 }
        );

        actualParticipant = await instance.participant.call(validParticipant2, { from: validParticipant2 });
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
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });

    it("should reject participation of bad hashed randoms after start", async () => {

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

        assert.isRejected(instance.participate(0, { from: validParticipant }));

        var actualParticipant = await instance.participant.call(validParticipant, { from: validParticipant });
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
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });

    it("should fail owner participation", async () => {

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

        assert.isRejected(instance.participate(
            validHashedRandom,
            { from: validOwner }
        ));

    });

    it("should fail participation without start", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var instance = await artifact.new();

        assert.isRejected(instance.participate(
            validHashedRandom,
            { from: validParticipant }
        ));

    });

    it("should reject participation before and after participation phase", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + 1;
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

        assert.isRejected(instance.participate(
            validHashedRandom,
            { from: validParticipant }
        ));

        await helpers.sleep(helpers.timeInterval + 1 + (helpers.timeInterval / 2));

        assert.isRejected(instance.participate(
            validHashedRandom,
            { from: validParticipant }
        ));

    });

    it("should reject multiple participation from same address", async () => {

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

        assert.isRejected(instance.participate(
            validHashedRandom,
            { from: validParticipant }
        ));

    });

}
