const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const raise = require('../script/simulation/raise');
const network = require('../chronicle/network');
const m = require('../../seedom-crypter/messages');

suite('reveal', (state) => {

    test("should reveal properly from owner", async () => {

        await raise.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isFulfilled(
            fundraiser.reveal({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

        const actualState = await fundraiser.state({ from: env.owner });

        assert.equalIgnoreCase(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equal(actualState.causeMessage, ch.zero32, "cause message should be zero");
        assert.isNotOk(actualState.causeWithdrawn, "cause not withdrawn");
        assert.equal(actualState.participant, ch.zero20, "selected zero");
        assert.equal(actualState.participantMessage, ch.zero32, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, "cause not withdrawn");
        assert.equalIgnoreCase(actualState.ownerMessage, env.ownerMessage, "owner message does not match");
        assert.isNotOk(actualState.ownerWithdrawn, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, env.participantsCount, "total participants zero");
        assert.equal(actualState.entries, env.participantsCount * 20, "total entries zero");
        assert.isAbove(Number(actualState.revealBlockNumber), 0, "reveal block number should be > 0");
        assert.isNotOk(Number(actualState.revealBlockHash), "reveal block hash should be zero");

    });

    test("should reject multiple valid reveals from owner", async () => {
        
        await raise.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isFulfilled(
            fundraiser.reveal({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

        await assert.isRejected(
            fundraiser.reveal({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject invalid reveal from owner", async () => {
        
        await raise.run(state);

        const { env } = state;
        // generate a new random message
        const ownerMessage = m.random();
        const ownerSecret = m.hash(ownerMessage, env.owner);

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isRejected(
            (await state.interfaces.fundraiser).reveal({
                message: ownerMessage
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject valid reveal from cause", async () => {
        
        await raise.run(state);

        const { env } = state;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isRejected(
            (await state.interfaces.fundraiser).reveal({
                message: env.ownerMessage
            }, { from: env.cause, transact: true })
        );

    });

    test("should reject valid reveal from participant", async () => {
        
        await raise.run(state);

        const { env } = state;
        const participant = state.network.keys[4].address;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isRejected(
            (await state.interfaces.fundraiser).begin({
                message: env.ownerMessage
            }, { from: participant, transact: true })
        );

    });

});