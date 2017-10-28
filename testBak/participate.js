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

    test("should accept two participants properly after start", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);
        var validRandom2 = validRandom + 1;
        var validHashedRandom2 = th.hashedRandom(validRandom2, validParticipant2);

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

        var actualParticipant = await contracts.charity.methods.participant, validParticipant, { from: validParticipant });
        var actualEntries = actualParticipant[0];
        var actualHashedRandom = actualParticipant[1];
        var actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 0, "entries should be zero");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(actualRandom.toNumber(), 0, "random should be zero");

        var actualBalance = await contracts.charity.methods.balance, validParticipant, { from: validParticipant });
        assert.equal(actualBalance.toNumber(), 0, "balance should be zero");

        var actualTotalEntries = await contracts.charity.methods.totalEntries, );
        var actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        var actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        var actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 0, "total entries should be zero");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 1, "total participants should be 1");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

        await contracts.charity.methods.participate(
            validHashedRandom2,
            { from: validParticipant2 }
        );

        actualParticipant = await contracts.charity.methods.participant, validParticipant2, { from: validParticipant2 });
        actualEntries = actualParticipant[0];
        actualHashedRandom = actualParticipant[1];
        actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 0, "entries should be zero");
        assert.equal(actualHashedRandom, validHashedRandom2, "hashed random does not match");
        assert.equal(actualRandom.toNumber(), 0, "random should be zero");

        actualBalance = await contracts.charity.methods.balance, validParticipant, { from: validParticipant });
        assert.equal(actualBalance.toNumber(), 0, "balance should be zero");

        actualTotalEntries = await contracts.charity.methods.totalEntries, );
        actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 0, "total entries should be zero");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 2, "total participants should be 2");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

    });

    test("should accept funding with participation and refund after start", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);
        var validRandom2 = validRandom + 1;
        var validHashedRandom2 = th.hashedRandom(validRandom2, validParticipant2);

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
            { from: validParticipant, value: 10500 }
        );

        actualParticipant = await contracts.charity.methods.participant, validParticipant, { from: validParticipant });
        actualEntries = actualParticipant[0];
        actualHashedRandom = actualParticipant[1];
        actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 10, "entries should be 10");
        assert.equal(actualHashedRandom, validHashedRandom, "hashed random does not match");
        assert.equal(actualRandom.toNumber(), 0, "random should be zero");

        actualBalance = await contracts.charity.methods.balance, validParticipant, { from: validParticipant });
        assert.equal(actualBalance.toNumber(), 500, "balance should be 500");

        actualTotalEntries = await contracts.charity.methods.totalEntries, );
        actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 10, "total entries should be 10");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 1, "total participants should be 1");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

    });

    test("should fail participation without start", async () => {

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

    test("should fail participation without construct", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);

        var instance = await artifact.new();

        assert.isRejected(contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        ));

    });

    test("should reject participation before and after participation phase", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + 1;
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

        assert.isRejected(contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        ));

        await th.sleep(th.timeInterval + 1 + (th.timeInterval / 2));

        assert.isRejected(contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        ));

    });

    test("should fail owner participation", async () => {

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

        assert.isRejected(contracts.charity.methods.participate(
            validHashedRandom,
            { from: validOwner }
        ));

    });

    test("should reject multiple participation from same address", async () => {

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

        assert.isRejected(contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        ));

    });

    test("should reject participation of bad hashed randoms after start", async () => {

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

        assert.isRejected(contracts.charity.methods.participate(0, { from: validParticipant }));

        var actualParticipant = await contracts.charity.methods.participant, validParticipant, { from: validParticipant });
        var actualEntries = actualParticipant[0];
        var actualHashedRandom = actualParticipant[1];
        var actualRandom = actualParticipant[2];

        assert.equal(actualEntries.toNumber(), 0, "entries should be zero");
        assert.equal(actualHashedRandom, 0, "hashed random should be zero");
        assert.equal(actualRandom.toNumber(), 0, "random should be zero");

        var actualBalance = await contracts.charity.methods.balance, validParticipant, { from: validParticipant });
        assert.equal(actualBalance.toNumber(), 0, "balance should be zero");

        var actualTotalEntries = await contracts.charity.methods.totalEntries, );
        var actualTotalRevealed = await contracts.charity.methods.totalRevealed, );
        var actualTotalParticipants = await contracts.charity.methods.totalParticipants, );
        var actualTotalRevealers = await contracts.charity.methods.totalRevealers, );

        assert.equal(actualTotalEntries.toNumber(), 0, "total entries should be zero");
        assert.equal(actualTotalRevealed.toNumber(), 0, "total revealed not zero");
        assert.equal(actualTotalParticipants.toNumber(), 0, "total participants should be zero");
        assert.equal(actualTotalRevealers.toNumber(), 0, "total revealers not zero");

    });

}
