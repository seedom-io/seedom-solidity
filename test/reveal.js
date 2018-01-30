const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const seed = require('../stage/seed');
const participate = require('../stage/participate');
const raise = require('../stage/raise');
const reveal = require('../stage/reveal');

suite('reveal', (state) => {

    test("should allow revelation after participation", async () => {

        // first reveal
        await reveal.stage(state);

        const stage = state.stage;

        for (let participant of stage.participants) {

            const actualParticipant = await stage.seedom.methods.participantsMapping(participant.address).call({ from: participant.address });
            const actualEntries = actualParticipant[0];
            const actualHashedRandom = actualParticipant[1];
            const actualRandom = state.web3.utils.toHex(actualParticipant[2]);

            assert.equal(actualEntries, 10, "entries should be correct");
            assert.equalIgnoreCase(actualHashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(actualRandom, participant.random, "random should be set");

        }

        const actualState = await stage.seedom.methods.state().call({ from: stage.owner });
        const totalEntries = stage.participantsCount * 10;
        assert.equal(actualState._totalEntries, totalEntries, "total entries should be correct");
        assert.equal(actualState._totalRevealed, totalEntries, "total revealed not correct");
        assert.equal(actualState._totalParticipants, stage.participantsCount, "total participants incorrect");
        assert.equal(actualState._totalRevealers, stage.participantsCount, "total revealers incorrect");

    });

    test("should reject random revelations of zero", async () => {

        // first seed
        await seed.stage(state);

        const stage = state.stage;
        const participant = state.accountAddresses[2];
        const random = '0';
        const hashedRandom = sh.hashedRandom(random, participant);
        
        let method = stage.seedom.methods.participate(hashedRandom);
        await assert.isFulfilled(
            networks.sendMethod(method, { from: participant, value: 10000 }, state)
        );

        now = ch.timestamp();
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        method = stage.seedom.methods.reveal('0x00000000000000000000000000000000000000000000000000000000000000');
        await assert.isRejected(
            networks.sendMethod(method, { from: participant }, state),
            parity.SomethingThrown
        );

    });

    test("should reject multiple revelations from same address", async () => {
        
        // first raise
        await raise.stage(state);
        
        const stage = state.stage;
        const participant = stage.participants[0];
        const now = ch.timestamp();
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        const method = stage.seedom.methods.reveal(participant.random);
        await assert.isFulfilled(
            networks.sendMethod(method, { from: participant.address }, state),
            parity.SomethingThrown
        );

        await assert.isRejected(
            networks.sendMethod(method, { from: participant.address }, state),
            parity.SomethingThrown
        );

    });

    test("should reject revelations without raising", async () => {
        
        // first participate
        await participate.stage(state);

        const stage = state.stage;
        const participant = stage.participants[0];
        const now = ch.timestamp();
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        const method = stage.seedom.methods.reveal(participant.random);
        await assert.isRejected(
            networks.sendMethod(method, { from: participant.address }, state),
            parity.SomethingThrown
        );

    });

    test("should reject incorrect randoms", async () => {
        
        // first raise
        await raise.stage(state);
        
        const stage = state.stage;
        const participant = stage.participants[0];
        const now = ch.timestamp();
        const revealTime = stage.revealTime;
        await cli.progress("waiting for reveal phase", revealTime - now);

        const incorrectRandom = sh.random();
        const method = stage.seedom.methods.reveal(incorrectRandom);
        await assert.isRejected(
            networks.sendMethod(method, { from: participant.address }, state),
            parity.SomethingThrown
        );

    });

    test("should reject revelations before and after revelation period", async () => {

        // first raise
        await raise.stage(state);
        
        const stage = state.stage;
        const participant = stage.participants[0];

        const method = stage.seedom.methods.reveal(participant.random);
        await assert.isRejected(
            networks.sendMethod(method, { from: participant.address }, state),
            parity.SomethingThrown
        );

        const now = ch.timestamp();
        const endTime = stage.endTime;
        await cli.progress("waiting for end phase", endTime - now);

        await assert.isRejected(
            networks.sendMethod(method, { from: participant.address }, state),
            parity.SomethingThrown
        );

    });

});
