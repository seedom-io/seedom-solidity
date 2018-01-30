const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const seed = require('../stage/seed');
const participate = require('../stage/participate');
const raise = require('../stage/raise');

suite('raise', (state) => {

    test("should allow raising and refund after participation", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        await raise.stage(state);

        const stage = state.stage;

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
    
            const actualBalance = await stage.seedom.methods.balancesMapping(participant.address).call({ from: participant.address });
            assert.equal(actualBalance, 0, "balance should be zero");

            const participationReceipt = stage.participationReceipts[i];
            const participationTransactionCost = await sh.getTransactionCost(participationReceipt.gasUsed, state.web3);
            const participationBalance = initialBalances[participant.address].minus(participationTransactionCost);

            const raiseReceipt = stage.raiseReceipts[i];
            const raiseTransactionCost = await sh.getTransactionCost(raiseReceipt.gasUsed, state.web3);
            // participant should be refunded 500 (partial entry) in transaction for a net loss of 10000
            const raiseBalance = participationBalance.minus(raiseTransactionCost).minus(10000);

            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), raiseBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualState = await stage.seedom.methods.state().call({ from: stage.owner });
        const totalEntries = stage.participantsCount * 10;
        assert.equal(actualState._totalEntries, totalEntries, "total entries should be correct");
        assert.equal(actualState._totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState._totalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualState._totalRevealers, 0, "total revealers not zero");

    });

    test("should reject raising without participation", async () => {

        await seed.stage(state);

        const stage = state.stage;
        
        const participant = state.accountAddresses[2];
        // call fallback function
        await assert.isRejected(
            parity.sendFallback(stage.seedom, {
                from: participant, value: 10500
            }, state),
            parity.SomethingThrown
        );

        const actualState = await stage.seedom.methods.state().call({ from: stage.owner });
        assert.equal(actualState._totalEntries, 0, "total entries should be zero");
        assert.equal(actualState._totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState._totalParticipants, 0, "total participants should be zero");
        assert.equal(actualState._totalRevealers, 0, "total revealers not zero");

        const actualParticipant = await stage.seedom.methods.participantsMapping(participant).call({ from: participant });
        const actualEntries = actualParticipant[0];
        const actualHashedRandom = actualParticipant[1];
        const actualRandom = actualParticipant[2];

        assert.equal(actualEntries, 0, "entries should be zero");
        assert.equal(actualHashedRandom, 0, "hashed random should be zero");
        assert.equal(actualRandom, 0, "random should be zero");

        const actualBalance = await stage.seedom.methods.balancesMapping(participant).call({ from: participant });
        assert.equal(actualBalance, 0, "refund balance should be zero");

    });

    test("should reject raising with no value after participation", async () => {

        await participate.stage(state);
        
        const stage = state.stage;
        const participant = stage.participants[0];
        // call fallback function
        await assert.isRejected(
            parity.sendFallback(stage.seedom, {
                from: participant.address, value: 0
            }, state),
            parity.SomethingThrown
        );

        const actualState = await stage.seedom.methods.state().call({ from: stage.owner });
        assert.equal(actualState._totalEntries, 0, "total entries should be zero");
        assert.equal(actualState._totalRevealed, 0, "total revealed not zero");
        assert.equal(actualState._totalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualState._totalRevealers, 0, "total revealers not zero");

        const actualParticipant = await stage.seedom.methods.participantsMapping(participant.address).call({ from: participant.address });
        const actualEntries = actualParticipant[0];
        const actualHashedRandom = actualParticipant[1];
        const actualRandom = actualParticipant[2];

        assert.equal(actualEntries, 0, "entries should be zero");
        assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
        assert.equal(actualRandom, 0, "random should be zero");

        const actualBalance = await stage.seedom.methods.balancesMapping(participant.address).call({ from: participant.address });
        assert.equal(actualBalance, 0, "refund balance should be zero");

    });

});
