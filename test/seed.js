const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const kickoff = require('../stage/kickoff');

suite('seed', (state) => {

    test("should seed properly from charity", async (stage) => {

        await kickoff.stage(state, stage);

        var charityRandom = th.random();
        var charityHashedRandom = th.hashedRandom(charityRandom, stage.charity);

        await parity.send(state.web3, state.web3Instances.charity.methods.seed(
            charityHashedRandom
        ).send({ from: stage.charity }));

        var actualCharityHashedRandom = await state.web3Instances.charity.methods.charityHashedRandom().call({ from: state.accountAddresses[2] });

        assert.equal(actualCharityHashedRandom, charityHashedRandom, "charity's hashed random does not match");

    });
/*
    test("should reject seed from owner", async () => {
        
        var instance = await artifact.new();

        var charityRandom = th.random();
        var charityHashedRandom = th.hashedRandom(charityRandom, charity);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        await contracts.charity.methods.kickoff(
            charity,
            charitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        assert.isRejected(contracts.charity.methods.seed(
            charityHashedRandom,
            { from: validOwner }
        ));

    });

    test("should reject seed from participant", async () => {
        
        var instance = await artifact.new();

        var charityRandom = th.random();
        var charityHashedRandom = th.hashedRandom(charityRandom, charity);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        await contracts.charity.methods.kickoff(
            charity,
            charitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        assert.isRejected(contracts.charity.methods.seed(
            charityHashedRandom,
            { from: validParticipant }
        ));

    });
*/
});