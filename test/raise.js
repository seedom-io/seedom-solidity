const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const seed = require('../script/simulation/seed');
const participate = require('../script/simulation/participate');
const raise = require('../script/simulation/raise');

suite('raise', (state) => {

    test("should allow raising and refund after participation", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        await raise.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await seedom.participantsMapping({
                address: participant.address
            }, { from: participant.address });
    
            assert.equal(actualParticipant.entries, 10, "entries should be correct");
            assert.equal(actualParticipant.hashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualParticipant.random, 0, "random should be zero");

            // check address balances
            const participateTransactionCost = await sh.getTransactionCost(participant.participateReceipt.gasUsed, state.web3);
            const participationBalance = initialBalances[participant.address].minus(participateTransactionCost);
            const raiseTransactionCost = await sh.getTransactionCost(participant.raiseReceipt.gasUsed, state.web3);
            // participant should be refunded 500 (partial entry) in transaction for a net loss of 10000
            const raiseBalance = participationBalance.minus(raiseTransactionCost).minus(10000);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), raiseBalance.toString(), "balance not expected for " + participant.address);

            // check balance()s
            const actualParticipantBalance = await seedom.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 0, "participant balance not zero");

        }

        // confirm state
        const actualState = await seedom.state({ from: env.owner });
        const totalEntries = env.participantsCount * 10;
        assert.equal(actualState.totalEntries, totalEntries, "total entries should be correct");
        assert.equal(actualState.totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalRevealers, 0, "total revealers not zero");

        // check balance()s
        const actualCharityReward = await seedom.balance({ from: env.charity });
        assert.equal(actualCharityReward, 0, "charity reward balance not zero");
        const actualOwnerReward = await seedom.balance({ from: env.owner });
        assert.equal(actualOwnerReward, 0, "owner reward balance not zero");

    });

    test("should reject raising without participation", async () => {

        await seed.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;
        
        const participant = state.accountAddresses[2];
        // call fallback function
        await assert.isRejected(
            seedom.fallback({
                from: participant, value: 10500, transact: true
            })
        );

        const actualState = await seedom.state({ from: env.owner });

        assert.equal(actualState.totalEntries, 0, "total entries should be zero");
        assert.equal(actualState.totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState.totalParticipants, 0, "total participants should be zero");
        assert.equal(actualState.totalRevealers, 0, "total revealers not zero");

        const actualParticipant = await seedom.participantsMapping({
            participant
        }, { from: participant });

        assert.equal(actualParticipant.entries, 0, "entries should be zero");
        assert.equal(actualParticipant.hashedRandom, 0, "hashed random should be zero");
        assert.equal(actualParticipant.random, 0, "random should be zero");

    });

    test("should reject raising with no value after participation", async () => {

        await participate.run(state);
        
        const { env } = state;
        const seedom = await state.interfaces.seedom;
        const participant = env.participants[0];
        // call fallback function
        await assert.isRejected(
            seedom.fallback({
                from: participant.address, value: 0, transact: true
            })
        );

        const actualState = await seedom.state({ from: env.owner });
        assert.equal(actualState.totalEntries, 0, "total entries should be zero");
        assert.equal(actualState.totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalRevealers, 0, "total revealers not zero");

        const actualParticipant = await seedom.participantsMapping({
            address: participant.address
        }, { from: participant.address });

        assert.equal(actualParticipant.entries, 0, "entries should be zero");
        assert.equal(actualParticipant.hashedRandom, participant.hashedRandom, "hashed random does not match");
        assert.equal(actualParticipant.random, 0, "random should be zero");

    });

    test("should reject raising with not enough value for one entry after participation", async () => {

        await participate.run(state);
        
        const { env } = state;
        const seedom = await state.interfaces.seedom;
        const participant = env.participants[0];
        // call fallback function
        await assert.isRejected(
            seedom.fallback({
                from: participant.address, value: 500, transact: true
            })
        );

        const actualState = await seedom.state({ from: env.owner });
        assert.equal(actualState.totalEntries, 0, "total entries should be zero");
        assert.equal(actualState.totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalRevealers, 0, "total revealers not zero");

        const actualParticipant = await seedom.participantsMapping({
            address: participant.address
        }, { from: participant.address });

        assert.equal(actualParticipant.entries, 0, "entries should be zero");
        assert.equal(actualParticipant.hashedRandom, participant.hashedRandom, "hashed random does not match");
        assert.equal(actualParticipant.random, 0, "random should be zero");

    });

});
