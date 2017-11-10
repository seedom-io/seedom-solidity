const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const kickoff = require('../stage/kickoff');
const seed = require('../stage/seed');
const participate = require('../stage/participate');
const fund = require('../stage/fund');
const reveal = require('../stage/reveal');

suite('reveal', (state) => {

    test("should allow revelation after participation", async () => {

        // first reveal
        await reveal.stage(state);

        const stage = state.stage;

        for (let participant of stage.participants) {

            const actualParticipant = await stage.instances.seedom.methods.participant(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = state.web3.utils.toHex(actualParticipant[2]);

            assert.equal(actualEntries, 10, "entries should be correct");
            assert.equalIgnoreCase(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, participant.random, "random should be set");

        }

        const actualTotalEntries = await stage.instances.seedom.methods.totalEntries().call({ from: stage.owner });
        const actualTotalRevealed = await stage.instances.seedom.methods.totalRevealed().call({ from: stage.owner });
        const actualTotalParticipants = await stage.instances.seedom.methods.totalParticipants().call({ from: stage.owner });
        const actualTotalRevealers = await stage.instances.seedom.methods.totalRevealers().call({ from: stage.owner });

        const totalEntries = stage.participantsCount * 10;
        assert.equal(actualTotalEntries, totalEntries, "total entries should be correct");
        assert.equal(actualTotalRevealed, totalEntries, "total revealed not correct");
        assert.equal(actualTotalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualTotalRevealers, stage.participantsCount, "total revealers incorrect");

    });

    test("should reject random revelations of zero", async () => {

        // first seed
        await seed.stage(state);

        const stage = state.stage;
        const participant = state.accountAddresses[2];
        const random = '0';
        const hashedRandom = sh.hashedRandom(random, participant);
        
        let method = stage.instances.seedom.methods.participate(hashedRandom);
        await assert.isFulfilled(
            parity.sendMethod(method, { from: participant, value: 10000 })
        );

        now = await sh.timestamp(stage.instances.seedom);
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        method = stage.instances.seedom.methods.reveal(0);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

    test("should reject multiple revelations from same address", async () => {
        
        // first fund
        await fund.stage(state);
        
        const stage = state.stage;
        const participant = stage.participants[0];
        const now = await sh.timestamp(stage.instances.seedom);
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        const method = stage.instances.seedom.methods.reveal(participant.random);
        await assert.isFulfilled(
            parity.sendMethod(method, { from: participant.address }),
            parity.SomethingThrown
        );

        await assert.isRejected(
            parity.sendMethod(method, { from: participant.address }),
            parity.SomethingThrown
        );

    });

    test("should reject revelations without funding", async () => {
        
        // first participate
        await participate.stage(state);

        const stage = state.stage;
        const participant = stage.participants[0];
        const now = await sh.timestamp(stage.instances.seedom);
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        const method = stage.instances.seedom.methods.reveal(participant.random);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant.address }),
            parity.SomethingThrown
        );

    });

    test("should reject incorrect randoms", async () => {
        
        // first fund
        await fund.stage(state);
        
        const stage = state.stage;
        const participant = stage.participants[0];
        const now = await sh.timestamp(stage.instances.seedom);
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        const method = stage.instances.seedom.methods.reveal(participant.random + 1);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant.address }),
            parity.SomethingThrown
        );

    });

    test("should reject revelations before and after revelation period", async () => {

        // first fund
        await fund.stage(state);
        
        const stage = state.stage;
        const participant = stage.participants[0];

        const method = stage.instances.seedom.methods.reveal(participant.random);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant.address }),
            parity.SomethingThrown
        );

        const now = await sh.timestamp(stage.instances.seedom);
        const endTime = stage.endTime;
        await cli.progress("waiting for end phase", endTime - now);

        await assert.isRejected(
            parity.sendMethod(method, { from: participant.address }),
            parity.SomethingThrown
        );

    });

});
