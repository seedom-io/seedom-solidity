const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const kickoff = require('../stage/kickoff');
const seed = require('../stage/seed');
const participate = require('../stage/participate');

suite('participate', (state) => {

    test("should accept participants after seed", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        await participate.stage(state);

        const stage = state.stage;

        // validate every participant
        for (let i = 0; i < stage.participantsCount; i++) {

            const participant = stage.participants[i];
            const actualParticipant = await stage.instances.seedom.methods.participant(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = actualParticipant[2];

            assert.equal(actualEntries, 0, "entries should be zero");
            assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, 0, "random should be zero");

            const actualBalance = await stage.instances.seedom.methods.balance(participant.address).call({ from: participant.address });
            assert.equal(actualBalance, 0, "balance should be zero");

            const participationReceipt = stage.participationReceipts[i];
            const participationTransactionCost = await sh.getTransactionCost(participationReceipt.gasUsed, state.web3);
            const participationBalance = initialBalances[participant.address].minus(participationTransactionCost);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualTotalEntries = await stage.instances.seedom.methods.totalEntries().call({ from: stage.owner });
        const actualTotalRevealed = await stage.instances.seedom.methods.totalRevealed().call({ from: stage.owner });
        const actualTotalParticipants = await stage.instances.seedom.methods.totalParticipants().call({ from: stage.owner });
        const actualTotalRevealers = await stage.instances.seedom.methods.totalRevealers().call({ from: stage.owner });

        assert.equal(actualTotalEntries, 0, "total entries should be zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });

    test("should accept and refund participants after seed", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        const stage = state.stage;
        // fund at refund generating amount
        stage.participationFunds = 10500;

        await participate.stage(state);

        // validate every participant
        for (let i = 0; i < stage.participantsCount; i++) {

            const participant = stage.participants[i];
            const actualParticipant = await stage.instances.seedom.methods.participant(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = actualParticipant[2];

            assert.equal(actualEntries, 10, "entries should be correct");
            assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, 0, "random should be zero");

            const actualBalance = await stage.instances.seedom.methods.balance(participant.address).call({ from: participant.address });
            assert.equal(actualBalance, 0, "balance should be zero");

            const participationReceipt = stage.participationReceipts[i];
            const participationTransactionCost = await sh.getTransactionCost(participationReceipt.gasUsed, state.web3);
            // participant should be refunded 500 (partial entry) in transaction for a net loss of 10000
            const participationBalance = initialBalances[participant.address].minus(participationTransactionCost).minus(10000);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualTotalEntries = await stage.instances.seedom.methods.totalEntries().call({ from: stage.owner });
        const actualTotalRevealed = await stage.instances.seedom.methods.totalRevealed().call({ from: stage.owner });
        const actualTotalParticipants = await stage.instances.seedom.methods.totalParticipants().call({ from: stage.owner });
        const actualTotalRevealers = await stage.instances.seedom.methods.totalRevealers().call({ from: stage.owner });

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
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        const method = stage.instances.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("should fail participation without kickoff", async () => {

        const stage = state.stage;
        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        const method = stage.instances.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

    
    test("should reject participation after participation phase", async () => {

        await seed.stage(state);

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.seedom);
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        method = stage.instances.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("should fail owner participation after seed", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, stage.owner);

        const method = stage.instances.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: stage.owner }),
            parity.SomethingThrown
        );

    });

    test("should reject multiple participation from same address after seed", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const participant = state.accountAddresses[2];
        let random = sh.random();
        let hashedRandom = sh.hashedRandom(random, participant);

        let method = stage.instances.seedom.methods.participate(hashedRandom);
        await assert.isFulfilled(
            parity.sendMethod(method, { from: participant })
        );

        method = stage.instances.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

        // generate a new random just for fun
        random = sh.random();
        hashedRandom = sh.hashedRandom(random, participant);

        method = stage.instances.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("reject participation of bad hashed randoms after seed", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const participant = state.accountAddresses[2];
        const hashedRandom = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        const method = stage.instances.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown,
            null,
            hashedRandom
        );

    });

});
