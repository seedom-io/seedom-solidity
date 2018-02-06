const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const instantiate = require('../script/simulation/instantiate');
const seed = require('../script/simulation/seed');
const participate = require('../script/simulation/participate');
const raise = require('../script/simulation/raise');
const reveal = require('../script/simulation/reveal');

suite('reveal', (state) => {

    test("should allow revelation after participation", async () => {

        // first reveal
        await reveal.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        for (let participant of env.participants) {

            const actualParticipant = await seedom.participantsMapping({
                address: participant.address
            }, { from: participant.address });

            assert.equal(actualParticipant.entries, 10, "entries should be correct");
            assert.equalIgnoreCase(actualParticipant.hashedRandom, participant.hashedRandom, "hashed random does not match");
            assert.equal(state.web3.utils.toHex(actualParticipant.random), participant.random, "random should be set");

        }

        const actualState = await seedom.state({ from: env.owner });

        const totalEntries = env.participantsCount * 10;
        assert.equal(actualState.totalEntries, totalEntries, "total entries should be correct");
        assert.equal(actualState.totalRevealed, totalEntries, "total revealed not correct");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalRevealers, env.participantsCount, "total revealers incorrect");

    });

    test("should reject random revelations of zero", async () => {

        // first seed
        await seed.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        const participant = state.accountAddresses[2];
        const random = '0';
        const hashedRandom = sh.hashedRandom(random, participant);
        
        await assert.isFulfilled(
            seedom.participate({
                hashedRandom
            }, { from: participant, value: 10000, transact: true })
        );

        now = ch.timestamp();
        await cli.progress("waiting for reveal phase", env.revealTime - now);

        await assert.isRejected(
            seedom.reveal({
                random: '0x00000000000000000000000000000000000000000000000000000000000000'
            }, { from: participant, value: 10000, transact: true })
        );

    });

    test("should reject multiple revelations from same address", async () => {
        
        // first raise
        await raise.run(state);
        
        const { env } = state;
        const seedom = await state.interfaces.seedom;

        const participant = env.participants[0];
        const now = ch.timestamp();
        await cli.progress("waiting for reveal phase", env.revealTime - now);

        await assert.isFulfilled(
            seedom.reveal({
                random: participant.random
            }, { from: participant.address, transact: true })
        );

        await assert.isRejected(
            seedom.reveal({
                random: participant.random
            }, { from: participant.address, transact: true })
        );

    });

    test("should reject revelations without raising", async () => {
        
        // first participate
        await participate.run(state);

        const { env } = state;
        
        const participant = env.participants[0];
        const now = ch.timestamp();
        await cli.progress("waiting for reveal phase", env.revealTime - now);

        await assert.isRejected(
            (await state.interfaces.seedom).reveal({
                random: participant.random
            }, { from: participant.address, transact: true })
        );

    });

    test("should reject incorrect randoms", async () => {
        
        // first raise
        await raise.run(state);
        
        const { env } = state;
        
        const participant = env.participants[0];
        const now = ch.timestamp();
        await cli.progress("waiting for reveal phase", env.revealTime - now);

        const incorrectRandom = sh.random();
        await assert.isRejected(
            (await state.interfaces.seedom).reveal({
                random: incorrectRandom
            }, { from: participant.address, transact: true })
        );

    });

    test("should reject revelations before and after revelation period", async () => {

        // first raise
        await raise.run(state);
        
        const { env } = state;
        const seedom = await state.interfaces.seedom;

        const participant = env.participants[0];

        await assert.isRejected(
            seedom.reveal({
                random: participant.random
            }, { from: participant.address, transact: true })
        );

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        await assert.isRejected(
            seedom.reveal({
                random: participant.random
            }, { from: participant.address, transact: true })
        );

    });

});
