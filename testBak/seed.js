const th = require('./helpers');
const parity = require('../parity');

suite('kickoff', (accounts) => {

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

    test("should seed properly from charity", async () => {

        var instance = await artifact.new();

        var validCharityRandom = th.random();
        var validCharityHashedRandom = th.hashedRandom(validCharityRandom, validCharity);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

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

        await contracts.charity.methods.seed(
            validCharityHashedRandom,
            { from: validCharity }
        );

        var actualCharityHashedRandom = await contracts.charity.methods.charityHashedRandom(),.call({ from: validParticipant });

        assert.equal(actualCharityHashedRandom, validCharityHashedRandom, "charity's hashed random does not match");

    });

    test("should reject seed from owner", async () => {
        
        var instance = await artifact.new();

        var validCharityRandom = th.random();
        var validCharityHashedRandom = th.hashedRandom(validCharityRandom, validCharity);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

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

        assert.isRejected(contracts.charity.methods.seed(
            validCharityHashedRandom,
            { from: validOwner }
        ));

    });

    test("should reject seed from participant", async () => {
        
        var instance = await artifact.new();

        var validCharityRandom = th.random();
        var validCharityHashedRandom = th.hashedRandom(validCharityRandom, validCharity);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

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

        assert.isRejected(contracts.charity.methods.seed(
            validCharityHashedRandom,
            { from: validParticipant }
        ));

    });

}