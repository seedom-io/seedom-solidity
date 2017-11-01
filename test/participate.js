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

    test("should fail participation without seed", async () => {

        await kickoff.stage(state);

        const stage = state.stage;
        const startTime = stage.startTime;
        const participant = state.accountAddresses[2];

        const kick = await state.web3Instances.charity.methods.currentKick().call({ from: participant });
        await cli.progress("waiting for start phase", startTime - kick._kickTime);

        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        const transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("should fail participation without instantiation", async () => {

        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        const transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: participant }),
            parity.SomethingThrown
        );

    });

    
    test("should reject participation before and after participation phase", async () => {

        await seed.stage(state);

        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        let transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: participant }),
            parity.SomethingThrown
        );

        const stage = state.stage;
        const revealTime = stage.revealTime;

        const kick = await state.web3Instances.charity.methods.currentKick().call({ from: participant });
        await cli.progress("waiting for reveal phase", revealTime - kick._kickTime);

        transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("should fail owner participation", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, stage.owner);
        const startTime = stage.startTime;

        const kick = await state.web3Instances.charity.methods.currentKick().call({ from: stage.owner });
        await cli.progress("waiting for start phase", startTime - kick._kickTime);

        const transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: stage.owner }),
            parity.SomethingThrown
        );

    });

    test("should reject multiple participation from same address", async () => {

        await seed.stage(state);
        
        const participant = state.accountAddresses[2];
        let random = sh.random();
        let hashedRandom = sh.hashedRandom(random, participant);
        const stage = state.stage;
        const startTime = stage.startTime;

        const kick = await state.web3Instances.charity.methods.currentKick().call({ from: participant });
        await cli.progress("waiting for start phase", startTime - kick._kickTime);

        let transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await assert.isFulfilled(
            parity.sendAndCheck(state.web3, transaction, { from: participant })
        );

        transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: participant }),
            parity.SomethingThrown
        );

        // generate a new random just for fun
        random = sh.random();
        hashedRandom = sh.hashedRandom(random, participant);

        transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("reject participation of bad hashed randoms after start", async () => {

        await seed.stage(state);
        
        const participant = state.accountAddresses[2];
        const stage = state.stage;
        const startTime = stage.startTime;

        const kick = await state.web3Instances.charity.methods.currentKick().call({ from: participant });
        await cli.progress("waiting for start phase", startTime - kick._kickTime);

        const hashedRandom = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const transaction = state.web3Instances.charity.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: participant }),
            parity.SomethingThrown,
            null,
            hashedRandom
        );

    });

});
