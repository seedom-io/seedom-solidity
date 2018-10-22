const end = require('../script/simulation/end');
const reveal = require('../script/simulation/reveal');
const raise = require('../script/simulation/raise');
const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');

suite('end', (state) => {

    /*test("should select a participant after owner reveal and cause end", async () => {

        await end.run(state);

        const { env } = state;

        const actualState = await (await state.interfaces.fundraiser).state({ from: env.owner });

        assert.equal(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equalIgnoreCase(actualState.causeMessage, env.causeMessage, "cause message does not match");
        assert.isNotOk(actualState.causeWithdrawn, "cause not withdrawn");
        assert.isOk(actualState.participant, "selected zero");
        assert.isOk(actualState.participantMessage, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, "participant not withdrawn");
        assert.equalIgnoreCase(actualState.ownerMessage, env.ownerMessage, "owner message does not match");
        assert.isNotOk(actualState.ownerWithdrawn, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.entries, env.participantsCount * 20, "total entries incorrect");
        assert.isAbove(Number(actualState.revealBlockNumber), 0, "reveal block number should be > 0");
        assert.isOk(Number(actualState.revealBlockHash), "reveal block hash should not be zero");

        let foundSelected = false;
        let participantMessage;
        const selected = actualState.participant.toLowerCase();
        for (let participant of env.participants) {
            if (participant.address.toLowerCase() === selected) {
                foundSelected = true;
                participantMessage = participant.message;
                break;
            }
        }

        assert.isOk(foundSelected, "one of the participants should have won");
        assert.equalIgnoreCase(actualState.participantMessage, participantMessage, "selected message incorrect");

    });

    test("should reject multiple ends from cause after owner reveal", async () => {
        
        await reveal.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        await assert.isFulfilled(
            fundraiser.end({
                message: env.causeMessage
            }, { from: env.cause, transact: true })
        );

        await assert.isRejected(
            fundraiser.end({
                message: env.causeMessage
            }, { from: env.cause, transact: true })
        );

    });

    test("should reject end before owner reveal", async () => {
        
        await raise.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        await assert.isRejected(
            (await state.interfaces.fundraiser).end({
                message: env.causeMessage
            }, { from: env.cause, transact: true })
        );

    });*/

    test("should reject after stale reveal (past 256 blocks)", async () => {

        await reveal.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        for (let i = 0; i < 256; i++) {
            (await state.interfaces.fundraiser).balance({ from: env.owner, transact: true });
        }

        await assert.isRejected(
            fundraiser.end({
                message: env.causeMessage
            }, { from: env.cause, transact: true })
        );

    });

});