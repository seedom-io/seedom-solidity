const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const begin = require('../script/simulation/begin');
const participate = require('../script/simulation/participate');
const raise = require('../script/simulation/raise');

suite('raise', (state) => {

    test("should allow raising and refund after participation", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let key of state.network.keys) {
            initialBalances[key.address] = await sh.getBalance(key.address, state.web3);
        }

        await raise.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await fundraiser.participants({
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
            const actualParticipantBalance = await fundraiser.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 0, "participant balance not zero");

        }

        // confirm state
        const actualState = await fundraiser.state({ from: env.owner });

        assert.equal(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equal(actualState.causeMessage, 0, "cause message zero");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.entries, env.participantsCount * 20, "total entries incorrect");

        // check balance()s
        const actualCauseReward = await fundraiser.balance({ from: env.cause });
        assert.equal(actualCauseReward, 0, "cause reward balance not zero");
        const actualOwnerReward = await fundraiser.balance({ from: env.owner });
        assert.equal(actualOwnerReward, 0, "owner reward balance not zero");

    });

    test("should reject raising without participation", async () => {

        await begin.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;
        
        const participant = state.network.keys[4].address;
        // call fallback function
        await assert.isRejected(
            fundraiser.fallback({
                from: participant, value: 10500, transact: true
            })
        );

        const actualState = await fundraiser.state({ from: env.owner });

        assert.equal(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equal(actualState.causeMessage, 0, "cause message zero");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, 0, "total participants not zero");
        assert.equal(actualState.entries, 0, "total entries not zero");

        const actualParticipant = await fundraiser.participants({
            participant
        }, { from: participant });

        assert.equal(actualParticipant.entries, 0, "entries should be zero");
        assert.equal(actualParticipant.message, 0, "message should be zero");

    });

    test("should reject raising with no value after participation", async () => {

        await participate.run(state);
        
        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;
        const participant = env.participants[0];
        // call fallback function
        await assert.isRejected(
            fundraiser.fallback({
                from: participant.address, value: 0, transact: true
            })
        );

        const actualState = await fundraiser.state({ from: env.owner });
        
        assert.equal(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equal(actualState.causeMessage, 0, "cause message zero");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.entries, env.participantsCount * 10, "total entries incorrect");

        const actualParticipant = await fundraiser.participants({
            address: participant.address
        }, { from: participant.address });

        assert.equal(actualParticipant.entries, 10, "entries should be correct");
        assert.equalIgnoreCase(actualParticipant.message, participant.message, "message should match");

    });

    test("should reject raising with not enough value for one entry after participation", async () => {

        await participate.run(state);
        
        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;
        const participant = env.participants[0];
        // call fallback function
        await assert.isRejected(
            fundraiser.fallback({
                from: participant.address, value: 500, transact: true
            })
        );

        const actualState = await fundraiser.state({ from: env.owner });
        
        assert.equal(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equal(actualState.causeMessage, 0, "cause message zero");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.entries, env.participantsCount * 10, "total entries incorrect");

        const actualParticipant = await fundraiser.participants({
            address: participant.address
        }, { from: participant.address });

        assert.equal(actualParticipant.entries, 10, "entries should be correct");
        assert.equalIgnoreCase(actualParticipant.message, participant.message, "message should match");

    });

});
