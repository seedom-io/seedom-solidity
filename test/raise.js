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

            const actualParticipant = await seedom.participants({
                address: participant.address
            }, { from: participant.address });
    
            assert.equal(actualParticipant.entries, 20, "entries should be correct");
            assert.equalIgnoreCase(actualParticipant.message, participant.message, "message should be correct");

            // check address balances
            const participateTransactionCost = await sh.getTransactionCost(participant.participateReceipt.gasUsed, state.web3);
            const participationBalance = initialBalances[participant.address].minus(participateTransactionCost);
            const raiseTransactionCost = await sh.getTransactionCost(participant.raiseReceipt.gasUsed, state.web3);
            // participant should be refunded 500 (partial entry) in transaction for a net loss of
            // 20000 (participation entries + raise entries)
            const raiseBalance = participationBalance.minus(raiseTransactionCost).minus(20000);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), raiseBalance.toString(), "balance not expected for " + participant.address);

            // check balance()s
            const actualParticipantBalance = await seedom.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 0, "participant balance not zero");

        }

        // confirm state
        const actualState = await seedom.state({ from: env.owner });

        assert.equal(actualState.charitySecret, env.charitySecret, "charity secret does not match");
        assert.equal(actualState.charityMessage, 0, "charity message zero");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.winner, 0, "winner zero");
        assert.equal(actualState.winnerMessage, 0, "winner message zero");
        assert.isNotOk(actualState.winnerWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalEntries, env.participantsCount * 20, "total entries incorrect");

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

        assert.equal(actualState.charitySecret, env.charitySecret, "charity secret does not match");
        assert.equal(actualState.charityMessage, 0, "charity message zero");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.winner, 0, "winner zero");
        assert.equal(actualState.winnerMessage, 0, "winner message zero");
        assert.isNotOk(actualState.winnerWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, 0, "total participants not zero");
        assert.equal(actualState.totalEntries, 0, "total entries not zero");

        const actualParticipant = await seedom.participants({
            participant
        }, { from: participant });

        assert.equal(actualParticipant.entries, 0, "entries should be zero");
        assert.equal(actualParticipant.message, 0, "message should be zero");

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
        
        assert.equal(actualState.charitySecret, env.charitySecret, "charity secret does not match");
        assert.equal(actualState.charityMessage, 0, "charity message zero");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.winner, 0, "winner zero");
        assert.equal(actualState.winnerMessage, 0, "winner message zero");
        assert.isNotOk(actualState.winnerWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalEntries, env.participantsCount * 10, "total entries incorrect");

        const actualParticipant = await seedom.participants({
            address: participant.address
        }, { from: participant.address });

        assert.equal(actualParticipant.entries, 10, "entries should be correct");
        assert.equalIgnoreCase(actualParticipant.message, participant.message, "message should match");

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
        
        assert.equal(actualState.charitySecret, env.charitySecret, "charity secret does not match");
        assert.equal(actualState.charityMessage, 0, "charity message zero");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.winner, 0, "winner zero");
        assert.equal(actualState.winnerMessage, 0, "winner message zero");
        assert.isNotOk(actualState.winnerWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalEntries, env.participantsCount * 10, "total entries incorrect");

        const actualParticipant = await seedom.participants({
            address: participant.address
        }, { from: participant.address });

        assert.equal(actualParticipant.entries, 10, "entries should be correct");
        assert.equalIgnoreCase(actualParticipant.message, participant.message, "message should match");

    });

});
