var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var th = require('./helpers');

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

    var validCharityRandom = th.random();
    var validCharityHashedRandom = th.hashedRandom(validCharityRandom, validCharity);

    test("should allow funding after participation", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        var instance = await artifact.new();

        await contracts.charity.methods.kickoff(
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

        await contracts.charity.methods.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await th.sleep(th.timeInterval + (th.timeInterval / 2));

        await contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        );

        // run fallback function
        await contracts.charity.methods.sendTransaction({ from: validParticipant, value: 10000 });

        var actualTotalEntries = await contracts.charity.methods.totalEntries, );
        var actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        var actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        var actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 10, "total entries incorrect");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 1, "total participants should be 1");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

        var actualParticipant = await contracts.charity.methods.participant, validParticipant, { from: validParticipant });
        var actualEntries = actualParticipant[0];
        var actualHashedRandom = actualParticipant[1];
        var actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 10, "expected entries does not match");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(actualRandom.toNumber(), 0, "random should be zero");

        var actualBalance = await contracts.charity.methods.balance, validParticipant, { from: validParticipant });
        assert.equal(actualBalance.toNumber(), 0, "balance should be zero");

    });

    test("should reject funding without participation", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        var instance = await artifact.new();

        await contracts.charity.methods.kickoff(
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

        await contracts.charity.methods.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await th.sleep(th.timeInterval + (th.timeInterval / 2));

        // run fallback function
        assert.isRejected(contracts.charity.methods.sendTransaction({ from: validParticipant, value: 10000 }));

        var actualTotalEntries = await contracts.charity.methods.totalEntries, );
        var actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        var actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        var actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 0, "total entries not zero");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 0, "total participants should be zero");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

    });

    test("should refund wei if partial entry value sent after participation", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        var instance = await artifact.new();

        await contracts.charity.methods.kickoff(
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

        await contracts.charity.methods.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await th.sleep(th.timeInterval + (th.timeInterval / 2));

        await contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        );

        // run fallback function
        await contracts.charity.methods.sendTransaction({ from: validParticipant, value: 10500 });

        var actualParticipant = await contracts.charity.methods.participant, validParticipant, { from: validParticipant });
        var actualEntries = actualParticipant[0];
        var actualHashedRandom = actualParticipant[1];
        var actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 10, "expected entries does not match");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(actualRandom.toNumber(), 0, "random should be zero");

        var actualBalance = await contracts.charity.methods.balance, validParticipant, { from: validParticipant });
        assert.equal(actualBalance.toNumber(), 500, "balance should be 500");

    });

    test("should reject funding with no value after participation", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        var instance = await artifact.new();

        await contracts.charity.methods.kickoff(
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

        await contracts.charity.methods.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await th.sleep(th.timeInterval + (th.timeInterval / 2));

        await contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        );

        // run fallback function
        assert.isRejected(contracts.charity.methods.sendTransaction({ from: validParticipant, value: 0 }));

        var actualTotalEntries = await contracts.charity.methods.totalEntries, );
        var actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        var actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        var actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 0, "total entries not zero");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 1, "total participants should be one");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

    });

}
