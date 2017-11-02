const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const kickoff = require('../stage/kickoff');
const seed = require('../stage/seed');
const participate = require('../stage/participate');

suite('fund', (state) => {

    test("should allow funding after participation", async () => {

        await participate.stage(state);

        const stage = state.stage;
        const participant = stage.participants[0];
        // call fallback function
        await assert.isFulfilled(
            parity.fallbackAndCheck(state.web3, state.instances.charity, { from: participant, value: 10500 })
        );

        const actualTotalEntries = await state.instances.charity.methods.totalEntries().call({ from: participant.address });
        const actualTotalRevealed = await state.instances.charity.methods.totalRevealed().call({ from: participant.address });
        const actualTotalParticipants = await state.instances.charity.methods.totalParticipants().call({ from: participant.address });
        const actualTotalRevealers = await state.instances.charity.methods.totalRevealers().call({ from: participant.address });

        const entries = stage.participants.length * 10 + 10;
        assert.equal(actualTotalEntries, entries, "total entries should be correct");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, stage.participants.length, "total participants incorrect");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

        const actualParticipant = await state.instances.charity.methods.participant(participant.address).call({ from: participant.address });
        const actualEntries = actualParticipant[0];
        const actualHashedRandom = actualParticipant[1];
        const actualRandom = actualParticipant[2];

        assert.equal(actualEntries, 20, "entries should be correct");
        assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
        assert.equal(actualRandom, 0, "random should be zero");

        const actualBalance = await state.instances.charity.methods.balance(participant.address).call({ from: participant.address });
        assert.equal(actualBalance, 500, "refund balance should be correct");

    });
/*
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
*/
});
