const select = require('../script/simulation/select');
const reveal = require('../script/simulation/reveal');
const raise = require('../script/simulation/raise');
const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');

suite('select', (state) => {

    test("should select a participant after charity reveal and owner select", async () => {

        await select.run(state);

        const { env } = state;

        const actualState = await (await state.interfaces.seedom).state({ from: env.owner });

        assert.equal(actualState.charitySecret, env.charitySecret, "charity secret does not match");
        assert.equalIgnoreCase(actualState.charityMessage, env.charityMessage, "charity message does not match");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.notEqual(actualState.selected, 0, "selected zero");
        assert.notEqual(actualState.selectedMessage, 0, "selected message zero");
        assert.isNotOk(actualState.selectedWithdrawn, 0, "charity not withdrawn");
        assert.equalIgnoreCase(actualState.ownerMessage, env.ownerMessage, "owner message does not match");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalEntries, env.participantsCount * 20, "total entries incorrect");

        let foundSelected = false;
        let selectedMessage;
        const selected = actualState.selected.toLowerCase();
        for (let participant of env.participants) {
            if (participant.address.toLowerCase() === selected) {
                foundSelected = true;
                selectedMessage = participant.message;
                break;
            }
        }

        assert.isOk(foundSelected, "one of the participants should have won");
        assert.equalIgnoreCase(actualState.selectedMessage, selectedMessage, "selected message incorrect");

    });

    test("should reject multiple selects from owner after charity reveal", async () => {
        
        await reveal.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        await assert.isFulfilled(
            seedom.select({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

        await assert.isRejected(
            seedom.select({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject select before charity reveal", async () => {
        
        await raise.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        await assert.isRejected(
            (await state.interfaces.seedom).select({
                message: env.ownerMessage
            }, { from: env.owner, transact: true })
        );

    });

});