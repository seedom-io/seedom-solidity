const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const kickoff = require('../stage/kickoff');

suite('kickoff', () => {

    test("should seed properly from charity", async () => {

        await instantiate.stage(stage);
        await kickoff.stage(stage);

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