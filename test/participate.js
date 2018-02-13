const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const seed = require('../script/simulation/seed');
const deploy = require('../script/simulation/deploy');
const participate = require('../script/simulation/participate');

suite('participate', (state) => {

    test("should accept participants after seed", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        await participate.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await seedom.participantsMapping({
                address: participant.address
            }, { from: participant.address });

            assert.equal(actualParticipant.entries, 0, "entries should be zero");
            assert.equal(actualParticipant.hashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualParticipant.random, 0, "random should be zero");

            const participateTransactionCost = await sh.getTransactionCost(participant.participateReceipt.gasUsed, state.web3);
            const participationBalance = initialBalances[participant.address].minus(participateTransactionCost);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

            // check balance()s
            const actualParticipantBalance = await seedom.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 0, "participant balance not zero");

        }

        const actualState = await seedom.state({ from: env.owner });
        assert.equal(actualState.totalEntries, 0, "total entries should be zero");
        assert.equal(actualState.totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalRevealers, 0, "total revealers not zero");
        assert.equal(actualState.winner, 0, "winner not zero");
        assert.equal(actualState.charityRandom, 0, "charity random not zero");

    });

    test("should accept and refund participants after seed", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        const { env } = state;

        // raise at refund generating amount
        env.participateRaise = 10500;
        await participate.run(state);

        const seedom = await state.interfaces.seedom;

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await seedom.participantsMapping({
                address: participant.address
            }, { from: participant.address });

            assert.equal(actualParticipant.entries, 10, "entries should be correct");
            assert.equal(actualParticipant.hashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualParticipant.random, 0, "random should be zero");

            const participateTransactionCost = await sh.getTransactionCost(participant.participateReceipt.gasUsed, state.web3);
            // participant should be refunded 500 (partial entry) in transaction for a net loss of 10000
            const participationBalance = initialBalances[participant.address].minus(participateTransactionCost).minus(10000);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualState = await seedom.state({ from: env.owner });
        const entries = env.participantsCount * 10;
        assert.equal(actualState.totalEntries, entries, "total entries should be zero");
        assert.equal(actualState.totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalRevealers, 0, "total revealers not zero");
        assert.equal(actualState.winner, 0, "winner not zero");
        assert.equal(actualState.charityRandom, 0, "charity random not zero");

    });

    test("reject participation if over max participants", async () => {

        await participate.run(state);
        
        const { env } = state;
        // get last participant that is never used otherwise
        const participant = state.accountAddresses[8];
        const random = sh.randomHex();
        const hashedRandom = sh.hashRandom(random, participant);
        
        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

    test("should fail participation without seed", async () => {

        await deploy.run(state);

        const { env } = state;
        const participant = state.accountAddresses[2];
        const random = sh.randomHex();
        const hashedRandom = sh.hashRandom(random, participant);

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

    test("should reject participation after participation phase", async () => {

        await seed.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for reveal phase", env.revealTime - now);

        const participant = state.accountAddresses[2];
        const random = sh.randomHex();
        const hashedRandom = sh.hashRandom(random, participant);

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

    test("should fail owner participation after seed", async () => {

        await seed.run(state);
        
        const { env } = state;
        const random = sh.randomHex();
        const hashedRandom = sh.hashRandom(random, env.owner);

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject multiple participation from same address after seed", async () => {

        await seed.run(state);
        
        const { env } = state;
        const seedom = await state.interfaces.seedom;
        const participant = state.accountAddresses[2];
        let random = sh.randomHex();
        let hashedRandom = sh.hashRandom(random, participant);

        await assert.isFulfilled(
            seedom.participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

        await assert.isRejected(
            seedom.participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

        // generate a new random just for fun
        random = sh.randomHex();
        hashedRandom = sh.hashRandom(random, participant);

        await assert.isRejected(
            seedom.participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

    test("reject participation of bad hashed randoms after seed", async () => {

        await seed.run(state);
        
        const { env } = state;
        const participant = state.accountAddresses[2];
        const hashedRandom = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                hashedRandom
            }, { from: participant, transact: true })
        );

    });

});
