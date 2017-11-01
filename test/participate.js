const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const participate = require('../stage/participate');

suite('participate', (state) => {

    test("should accept participants properly after start", async () => {

        await participate.stage(state);

        const stage = state.stage;

        // validate every participant
        for (let participant of stage.participants) {

            const actualParticipant = await state.web3Instances.charity.methods.participant(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = actualParticipant[2];

            assert.equal(actualEntries, 0, "entries should be zero");
            assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, 0, "random should be zero");

            const actualBalance = await state.web3Instances.charity.methods.balance(participant.address).call({ from: participant.address });
            assert.equal(actualBalance, 0, "balance should be zero");

        }

        let actualTotalEntries = await state.web3Instances.charity.methods.totalEntries().call({ from: stage.owner });
        let actualTotalRevealed = await state.web3Instances.charity.methods.totalRevealed().call({ from: stage.owner });
        let actualTotalParticipants = await state.web3Instances.charity.methods.totalParticipants().call({ from: stage.owner });
        let actualTotalRevealers = await state.web3Instances.charity.methods.totalRevealers().call({ from: stage.owner });

        assert.equal(actualTotalEntries, 0, "total entries should be zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, stage.participants.length, "total participants incorrect");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });

    test("should accept and refund participants properly after start", async () => {

        const stage = state.stage;
        // fund at refund generating amount
        stage.participantFunds = 10500;

        await participate.stage(state);

        // validate every participant
        for (let participant of stage.participants) {

            const actualParticipant = await state.web3Instances.charity.methods.participant(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = actualParticipant[2];

            assert.equal(actualEntries, 10, "entries should be correct");
            assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, 0, "random should be zero");

            const actualBalance = await state.web3Instances.charity.methods.balance(participant.address).call({ from: participant.address });
            assert.equal(actualBalance, 500, "refund balance should be correct");

        }

        let actualTotalEntries = await state.web3Instances.charity.methods.totalEntries().call({ from: stage.owner });
        let actualTotalRevealed = await state.web3Instances.charity.methods.totalRevealed().call({ from: stage.owner });
        let actualTotalParticipants = await state.web3Instances.charity.methods.totalParticipants().call({ from: stage.owner });
        let actualTotalRevealers = await state.web3Instances.charity.methods.totalRevealers().call({ from: stage.owner });

        const entries = stage.participants.length * 10;
        assert.equal(actualTotalEntries, entries, "total entries should be zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, stage.participants.length, "total participants incorrect");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });
/*
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
    */

});
