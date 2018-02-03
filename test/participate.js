const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const network = require('../chronicle/network');
const instantiate = require('../stage/instantiate');
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
            const actualParticipant = await stage.seedom.methods.participantsMapping(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = actualParticipant[2];

            assert.equal(actualEntries, 0, "entries should be zero");
            assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, 0, "random should be zero");

            const participationReceipt = stage.participationReceipts[i];
            const participationTransactionCost = await sh.getTransactionCost(participationReceipt.gasUsed, state.web3);
            const participationBalance = initialBalances[participant.address].minus(participationTransactionCost);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualState = await stage.seedom.methods.state().call({ from: stage.owner });
        assert.equal(actualState._totalEntries, 0, "total entries should be zero");
        assert.equal(actualState._totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState._totalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualState._totalRevealers, 0, "total revealers not zero");

    });

    test("should accept and refund participants after seed", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        const stage = state.stage;
        // raise at refund generating amount
        stage.participationWei = 10500;

        await participate.stage(state);

        // validate every participant
        for (let i = 0; i < stage.participantsCount; i++) {

            const participant = stage.participants[i];
            const actualParticipant = await stage.seedom.methods.participantsMapping(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = actualParticipant[2];

            assert.equal(actualEntries, 10, "entries should be correct");
            assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, 0, "random should be zero");

            const participationReceipt = stage.participationReceipts[i];
            const participationTransactionCost = await sh.getTransactionCost(participationReceipt.gasUsed, state.web3);
            // participant should be refunded 500 (partial entry) in transaction for a net loss of 10000
            const participationBalance = initialBalances[participant.address].minus(participationTransactionCost).minus(10000);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualState = await stage.seedom.methods.state().call({ from: stage.owner });
        const entries = stage.participantsCount * 10;
        assert.equal(actualState._totalEntries, entries, "total entries should be zero");
        assert.equal(actualState._totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState._totalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualState._totalRevealers, 0, "total revealers not zero");

    });

    test("reject participation if over max participants", async () => {

        await participate.stage(state);
        
        const stage = state.stage;
        // get last participant that is never used otherwise
        const participant = state.accountAddresses[8];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);
        
        const method = stage.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            network.sendMethod(method, { from: participant }, state)
        );

    });

    test("should fail participation without seed", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        const method = stage.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            network.sendMethod(method, { from: participant }, state)
        );

    });

    test("should reject participation after participation phase", async () => {

        await seed.stage(state);

        const stage = state.stage;
        const now = ch.timestamp();
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        const participant = state.accountAddresses[2];
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, participant);

        method = stage.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            network.sendMethod(method, { from: participant }, state)
        );

    });

    test("should fail owner participation after seed", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const random = sh.random();
        const hashedRandom = sh.hashedRandom(random, stage.owner);

        const method = stage.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            network.sendMethod(method, { from: stage.owner }, state)
        );

    });

    test("should reject multiple participation from same address after seed", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const participant = state.accountAddresses[2];
        let random = sh.random();
        let hashedRandom = sh.hashedRandom(random, participant);

        let method = stage.seedom.methods.participate(hashedRandom);
        await assert.isFulfilled(
            network.sendMethod(method, { from: participant }, state)
        );

        method = stage.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            network.sendMethod(method, { from: participant }, state)
        );

        // generate a new random just for fun
        random = sh.random();
        hashedRandom = sh.hashedRandom(random, participant);

        method = stage.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            network.sendMethod(method, { from: participant }, state)
        );

    });

    test("reject participation of bad hashed randoms after seed", async () => {

        await seed.stage(state);
        
        const stage = state.stage;
        const participant = state.accountAddresses[2];
        const hashedRandom = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        const method = stage.seedom.methods.participate(hashedRandom);
        await assert.isRejected(
            network.sendMethod(method, { from: participant }, state)
        );

    });

});
