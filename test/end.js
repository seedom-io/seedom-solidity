const end = require('../script/simulation/end');
const reveal = require('../script/simulation/reveal');
const raise = require('../script/simulation/raise');
const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');

suite('end', (state) => {

    test("should select a participant after cause reveal and owner end", async () => {

        await end.run(state);

        const { env } = state;

        const actualState = await (await state.interfaces.fundraiser).state({ from: env.owner });

        assert.equal(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equalIgnoreCase(actualState.causeMessage, env.causeMessage, "cause message does not match");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.notEqual(actualState.participant, 0, "selected zero");
        assert.notEqual(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equalIgnoreCase(actualState.ownerMessage, env.ownerMessage, "owner message does not match");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalEntries, env.participantsCount * 20, "total entries incorrect");

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

    /*test("should reject multiple ends from owner after cause reveal", async () => {
        
        await reveal.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        await assert.isFulfilled(
            fundraiser.end({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

        await assert.isRejected(
            fundraiser.end({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject end before cause reveal", async () => {
        
        await raise.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        await assert.isRejected(
            (await state.interfaces.fundraiser).end({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

    });*/

});