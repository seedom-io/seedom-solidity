const end = require('../script/simulation/end');
const reveal = require('../script/simulation/reveal');
const raise = require('../script/simulation/raise');
const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');

suite('end', (state) => {

    test("should choose a winner after charity reveal and owner end", async () => {

        await end.run(state);

        const { env } = state;

        const actualState = await (await state.interfaces.seedom).state({ from: env.owner });

        assert.equal(actualState.charitySecret, env.charitySecret, "charity secret does not match");
        assert.equalIgnoreCase(actualState.charityMessage, env.charityMessage, "charity message does not match");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.notEqual(actualState.winner, 0, "winner zero");
        assert.notEqual(actualState.winnerMessage, 0, "winner message zero");
        assert.isNotOk(actualState.winnerWithdrawn, 0, "charity not withdrawn");
        assert.equalIgnoreCase(actualState.ownerMessage, env.ownerMessage, "owner message does not match");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalEntries, env.participantsCount * 20, "total entries incorrect");

        let foundWinner = false;
        let winnerMessage;
        const winner = actualState.winner.toLowerCase();
        for (let participant of env.participants) {
            if (participant.address.toLowerCase() === winner) {
                foundWinner = true;
                winnerMessage = participant.message;
                break;
            }
        }

        assert.isOk(foundWinner, "one of the participants should have won");
        assert.equalIgnoreCase(actualState.winnerMessage, winnerMessage, "winner message incorrect");

    });

    test("should reject multiple ends from owner after charity reveal", async () => {
        
        await reveal.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        await assert.isFulfilled(
            seedom.end({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

        await assert.isRejected(
            seedom.end({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject end before charity reveal", async () => {
        
        await raise.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        await assert.isRejected(
            (await state.interfaces.seedom).end({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

    });

});