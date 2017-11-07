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

        await fund.stage(state);

        const stage = state.stage;

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
            parity.sendFallback(state.web3, stage.instances.charity, { from: participant, value: 10500 }),
            parity.SomethingThrown
        );

        const actualTotalEntries = await stage.instances.charity.methods.totalEntries().call({ from: participant });
        const actualTotalRevealed = await stage.instances.charity.methods.totalRevealed().call({ from: participant });
        const actualTotalParticipants = await stage.instances.charity.methods.totalParticipants().call({ from: participant });
        const actualTotalRevealers = await stage.instances.charity.methods.totalRevealers().call({ from: participant });

        assert.equal(actualTotalEntries, 0, "total entries should be zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, 0, "total participants should be zero");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

        const actualParticipant = await stage.instances.charity.methods.participant(participant).call({ from: participant });
        const actualEntries = actualParticipant[0];
        const actualHashedRandom = actualParticipant[1];
        const actualRandom = actualParticipant[2];

        assert.equal(actualEntries, 0, "entries should be zero");
        assert.equal(actualHashedRandom, 0, "hashed random should be zero");
        assert.equal(actualRandom, 0, "random should be zero");

        const actualBalance = await stage.instances.charity.methods.balance(participant).call({ from: participant });
        assert.equal(actualBalance, 0, "refund balance should be zero");

    });

    test("should reject funding with no value after participation", async () => {

        await participate.stage(state);
        
        const stage = state.stage;
        const participant = stage.participants[0];
        // call fallback function
        await assert.isRejected(
            parity.sendFallback(state.web3, stage.instances.charity, { from: participant.address, value: 0 }),
            parity.SomethingThrown
        );

        const actualTotalEntries = await stage.instances.charity.methods.totalEntries().call({ from: participant.address });
        const actualTotalRevealed = await stage.instances.charity.methods.totalRevealed().call({ from: participant.address });
        const actualTotalParticipants = await stage.instances.charity.methods.totalParticipants().call({ from: participant.address });
        const actualTotalRevealers = await stage.instances.charity.methods.totalRevealers().call({ from: participant.address });

        assert.equal(actualTotalEntries, 0, "total entries should be zero");
        assert.equal(actualTotalRevealed, 0, "total revealed not zero");
        assert.equal(actualTotalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualTotalRevealers, 0, "total revealers not zero");

        const actualParticipant = await stage.instances.charity.methods.participant(participant.address).call({ from: participant.address });
        const actualEntries = actualParticipant[0];
        const actualHashedRandom = actualParticipant[1];
        const actualRandom = actualParticipant[2];

        assert.equal(actualEntries, 0, "entries should be zero");
        assert.equal(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
        assert.equal(actualRandom, 0, "random should be zero");

        const actualBalance = await stage.instances.charity.methods.balance(participant.address).call({ from: participant.address });
        assert.equal(actualBalance, 0, "refund balance should be zero");

    });

});
