const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const raise = require('../script/simulation/raise');
const network = require('../chronicle/network');

suite('reveal', (state) => {

    test("should reveal properly from cause", async () => {

        await raise.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isFulfilled(
            fundraiser.reveal({
                message: env.causeMessage
            }, { from: env.cause, transact: true })
        );

        const actualState = await fundraiser.state({ from: env.owner });

        assert.equal(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equalIgnoreCase(actualState.causeMessage, env.causeMessage, "cause message does not match");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, env.participantsCount, "total participants zero");
        assert.equal(actualState.entries, env.participantsCount * 20, "total entries zero");

    });

    test("should reject multiple valid reveals from cause", async () => {
        
        await raise.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isFulfilled(
            fundraiser.reveal({
                message: env.causeMessage
            }, { from: env.cause, transact: true })
        );

        await assert.isRejected(
            fundraiser.reveal({
                message: env.causeMessage
            }, { from: env.cause, transact: true })
        );

    });

    test("should reject invalid reveal from cause", async () => {
        
        await raise.run(state);

        const { env } = state;
        // generate a new random message
        const causeMessage = sh.messageHex();
        const causeSecret = sh.hashMessage(causeMessage, env.cause);

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isRejected(
            (await state.interfaces.fundraiser).reveal({
                message: causeMessage
            }, { from: env.cause, transact: true })
        );

    });

    test("should reject valid reveal from owner", async () => {
        
        await raise.run(state);

        const { env } = state;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isRejected(
            (await state.interfaces.fundraiser).reveal({
                message: env.causeMessage
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject valid reveal from participant", async () => {
        
        await raise.run(state);

        const { env } = state;
        const participant = state.accountAddresses[2];

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isRejected(
            (await state.interfaces.fundraiser).begin({
                message: env.causeMessage
            }, { from: participant, transact: true })
        );

    });

});