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

    test("should allow revelation after participation", async () => {

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

        await th.sleep(th.timeInterval);

        await contracts.charity.methods.reveal(
            validRandom,
            { from: validParticipant }
        );

        var actualParticipant = await contracts.charity.methods.participant, validParticipant, { from: validParticipant });
        var actualEntries = actualParticipant[0];
        var actualHashedRandom = actualParticipant[1];
        var actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 10, "entries should be 10");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(th.hexBigNumber(actualRandom), validRandom, "randoms should match");

        actualTotalEntries = await contracts.charity.methods.totalEntries, );
        actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 10, "total entries incorrect");
        assert.equal(actualTotalRevealed.toNumber(), 10, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 1, "total participants should be 1");
        assert.equal(actualTotalRevealers.toNumber(), 1, "total revealers not zero");

    });

    test("should reject random revelations too low", async () => {

        var validRandom = th.random(8);
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

        await th.sleep(th.timeInterval);

        assert.isRejected(contracts.charity.methods.reveal(
            validRandom,
            { from: validParticipant }
        ));

    });

    test("should reject multiple revelations from same address", async () => {
        
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

        await th.sleep(th.timeInterval);

        contracts.charity.methods.reveal(
            validRandom,
            { from: validParticipant }
        );

        assert.isRejected(contracts.charity.methods.reveal(
            validRandom,
            { from: validParticipant }
        ));

    });

    test("should reject revelations without funding", async () => {
        
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

        await th.sleep(th.timeInterval);

        assert.isRejected(contracts.charity.methods.reveal(
            validRandom,
            { from: validParticipant }
        ));

    });

    test("should reject revelations before start", async () => {
        
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


        // wait for charity to start
        await th.sleep(th.timeInterval + (th.timeInterval / 2));

        assert.isRejected(contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        ));

    });

    test("should reject owner revelations", async () => {
        
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

        await th.sleep(th.timeInterval);

        assert.isRejected(contracts.charity.methods.reveal(
            validRandom,
            { from: validOwner }
        ));

    });

    test("should reject incorrect randoms", async () => {
        
        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);
        var invalidRandom = th.random();

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

        await th.sleep(th.timeInterval);

        assert.isRejected(contracts.charity.methods.reveal(
            invalidRandom,
            { from: validParticipant }
        ));

    });

    test("should reject revelations before and after revelation period", async () => {
        
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

        assert.isRejected(contracts.charity.methods.reveal(
            validRandom,
            { from: validParticipant }
        ));

        await th.sleep(th.timeInterval * 2);

        assert.isRejected(contracts.charity.methods.reveal(
            validRandom,
            { from: validParticipant }
        ));

    });

}
