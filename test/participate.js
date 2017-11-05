const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const kickoff = require('../stage/kickoff');
const seed = require('../stage/seed');
const participate = require('../stage/participate');

suite('participate', (state) => {

    test("should accept participants properly after start", async () => {

        await participate.stage(state);

        const stage = state.stage;

        // validate every participant
        for (let participant of stage.participants) {

            const actualParticipant = await stage.instances.charity.methods.participant(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = actualParticipant[2];

            assert.equal(actualEntries, 0, "entries should be zero");
            assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, 0, "random should be zero");

            const actualBalance = await stage.instances.charity.methods.balance(participant.address).call({ from: participant.address });
            assert.equal(actualBalance, 0, "balance should be zero");

        }

        const actualTotalEntries = await stage.instances.charity.methods.totalEntries().call({ from: stage.owner });
        const actualTotalRevealed = await stage.instances.charity.methods.totalRevealed().call({ from: stage.owner });
        const actualTotalParticipants = await stage.instances.charity.methods.totalParticipants().call({ from: stage.owner });
        const actualTotalRevealers = await stage.instances.charity.methods.totalRevealers().call({ from: stage.owner });

        assert.equal(actualTotalEntries, 0, "total entries should be zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });

    test("should accept and refund participants properly after start", async () => {

        const stage = state.stage;
        // fund at refund generating amount
        stage.participationFunds = 10500;

        await participate.stage(state);

        // validate every participant
        for (let participant of stage.participants) {

            const actualParticipant = await stage.instances.charity.methods.participant(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = actualParticipant[2];

            assert.equal(actualEntries, 10, "entries should be correct");
            assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, 0, "random should be zero");

            const actualBalance = await stage.instances.charity.methods.balance(participant.address).call({ from: participant.address });
            assert.equal(actualBalance, 500, "refund balance should be correct");

        }

        const actualTotalEntries = await stage.instances.charity.methods.totalEntries().call({ from: stage.owner });
        const actualTotalRevealed = await stage.instances.charity.methods.totalRevealed().call({ from: stage.owner });
        const actualTotalParticipants = await stage.instances.charity.methods.totalParticipants().call({ from: stage.owner });
        const actualTotalRevealers = await stage.instances.charity.methods.totalRevealers().call({ from: stage.owner });

        const entries = stage.participantsCount * 10;
        assert.equal(actualTotalEntries, entries, "total entries should be zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });

    test("should fail participation without seed", async () => {

        await kickoff.stage(state);

        const stage = state.stage;
        const participant = state.accountAddresses[2];

        const now = await sh.timestamp(stage.instances.charity);
        const startTime = stage.startTime;
        await cli.progress("waiting for start phase", startTime - now);

        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        const method = stage.instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("should fail participation without instantiation", async () => {

        const stage = state.stage;
        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        const method = stage.instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

    
    test("should reject participation before and after participation phase", async () => {

        await seed.stage(state);

        const stage = state.stage;
        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        let method = stage.instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

        const now = await sh.timestamp(stage.instances.charity);
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        method = stage.instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("should fail owner participation", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, stage.owner);

        const now = await sh.timestamp(stage.instances.charity);
        const startTime = stage.startTime;
        await cli.progress("waiting for start phase", startTime - now);

        const method = stage.instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: stage.owner }),
            parity.SomethingThrown
        );

    });

    test("should reject multiple participation from same address", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const participant = state.accountAddresses[2];
        let random = sh.random();
        let hashedRandom = sh.hashedRandom(random, participant);

        const now = await sh.timestamp(stage.instances.charity);
        const startTime = stage.startTime;
        await cli.progress("waiting for start phase", startTime - now);

        let method = stage.instances.charity.methods.participate(hashedRandom);
        await assert.isFulfilled(
            parity.sendMethod(method, { from: participant })
        );

        method = stage.instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

        // generate a new random just for fun
        random = sh.random();
        hashedRandom = sh.hashedRandom(random, participant);

        method = stage.instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("reject participation of bad hashed randoms after start", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const participant = state.accountAddresses[2];

        const now = await sh.timestamp(stage.instances.charity);
        const startTime = stage.startTime;
        await cli.progress("waiting for start phase", startTime - now);

        const hashedRandom = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const method = stage.instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown,
            null,
            hashedRandom
        );

    });

});
