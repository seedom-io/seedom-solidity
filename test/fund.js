const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const kickoff = require('../stage/kickoff');
const seed = require('../stage/seed');
const participate = require('../stage/participate');
const fund = require('../stage/fund');

suite('fund', (state) => {

    test("should allow funding and refund after participation", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        await fund.stage(state);

        const stage = state.stage;

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
            const participationBalance = initialBalances[participant.address].minus(participationTransactionCost);

            const fundReceipt = stage.fundReceipts[i];
            const fundTransactionCost = await sh.getTransactionCost(fundReceipt.gasUsed, state.web3);
            // participant should be refunded 500 (partial entry) in transaction for a net loss of 10000
            const fundBalance = participationBalance.minus(fundTransactionCost).minus(10000);

            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), fundBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualTotalEntries = await stage.instances.seedom.methods.totalEntries().call({ from: stage.owner });
        const actualTotalRevealed = await stage.instances.seedom.methods.totalRevealed().call({ from: stage.owner });
        const actualTotalParticipants = await stage.instances.seedom.methods.totalParticipants().call({ from: stage.owner });
        const actualTotalRevealers = await stage.instances.seedom.methods.totalRevealers().call({ from: stage.owner });

        const totalEntries = stage.participantsCount * 10;
        assert.equal(actualTotalEntries, totalEntries, "total entries should be correct");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

    });

    test("should reject funding without participation", async () => {

        await seed.stage(state);

        const stage = state.stage;
        
        const participant = state.accountAddresses[2];
        // call fallback function
        await assert.isRejected(
            parity.sendFallback(state.web3, stage.instances.seedom, { from: participant, value: 10500 }),
            parity.SomethingThrown
        );

        const actualTotalEntries = await stage.instances.seedom.methods.totalEntries().call({ from: participant });
        const actualTotalRevealed = await stage.instances.seedom.methods.totalRevealed().call({ from: participant });
        const actualTotalParticipants = await stage.instances.seedom.methods.totalParticipants().call({ from: participant });
        const actualTotalRevealers = await stage.instances.seedom.methods.totalRevealers().call({ from: participant });

        assert.equal(actualTotalEntries, 0, "total entries should be zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, 0, "total participants should be zero");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

        const actualParticipant = await stage.instances.seedom.methods.participant(participant).call({ from: participant });
        const actualEntries = actualParticipant[0];
        const actualHashedRandom = actualParticipant[1];
        const actualRandom = actualParticipant[2];

        assert.equal(actualEntries, 0, "entries should be zero");
        assert.equal(actualHashedRandom, 0, "hashed random should be zero");
        assert.equal(actualRandom, 0, "random should be zero");

        const actualBalance = await stage.instances.seedom.methods.balance(participant).call({ from: participant });
        assert.equal(actualBalance, 0, "refund balance should be zero");

    });

    test("should reject funding with no value after participation", async () => {

        await participate.stage(state);
        
        const stage = state.stage;
        const participant = stage.participants[0];
        // call fallback function
        await assert.isRejected(
            parity.sendFallback(state.web3, stage.instances.seedom, { from: participant.address, value: 0 }),
            parity.SomethingThrown
        );

        const actualTotalEntries = await stage.instances.seedom.methods.totalEntries().call({ from: participant.address });
        const actualTotalRevealed = await stage.instances.seedom.methods.totalRevealed().call({ from: participant.address });
        const actualTotalParticipants = await stage.instances.seedom.methods.totalParticipants().call({ from: participant.address });
        const actualTotalRevealers = await stage.instances.seedom.methods.totalRevealers().call({ from: participant.address });

        assert.equal(actualTotalEntries, 0, "total entries should be zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

        const actualParticipant = await stage.instances.seedom.methods.participant(participant.address).call({ from: participant.address });
        const actualEntries = actualParticipant[0];
        const actualHashedRandom = actualParticipant[1];
        const actualRandom = actualParticipant[2];

        assert.equal(actualEntries, 0, "entries should be zero");
        assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
        assert.equal(actualRandom, 0, "random should be zero");

        const actualBalance = await stage.instances.seedom.methods.balance(participant.address).call({ from: participant.address });
        assert.equal(actualBalance, 0, "refund balance should be zero");

    });

});
