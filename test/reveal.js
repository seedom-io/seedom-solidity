const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const raise = require('../script/simulation/raise');
const network = require('../chronicle/network');

suite('reveal', (state) => {

    test("should reveal properly from charity", async () => {

        await raise.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        await assert.isFulfilled(
            seedom.reveal({
                message: env.charityMessage
            }, { from: env.charity, transact: true })
        );

        const actualState = await seedom.state({ from: env.owner });

        assert.equal(actualState.charitySecret, env.charitySecret, "charity secret does not match");
        assert.equalIgnoreCase(actualState.charityMessage, env.charityMessage, "charity message does not match");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.selected, 0, "selected zero");
        assert.equal(actualState.selectedMessage, 0, "selected message zero");
        assert.isNotOk(actualState.selectedWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants zero");
        assert.equal(actualState.totalEntries, env.participantsCount * 20, "total entries zero");

    });

    test("should reject multiple valid reveals from charity", async () => {
        
        await raise.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        await assert.isFulfilled(
            seedom.reveal({
                message: env.charityMessage
            }, { from: env.charity, transact: true })
        );

        await assert.isRejected(
            seedom.reveal({
                message: env.charityMessage
            }, { from: env.charity, transact: true })
        );

    });

    test("should reject invalid reveal from charity", async () => {
        
        await raise.run(state);

        const { env } = state;
        // generate a new random message
        const charityMessage = sh.messageHex();
        const charitySecret = sh.hashMessage(charityMessage, env.charity);

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        await assert.isRejected(
            (await state.interfaces.seedom).reveal({
                message: charityMessage
            }, { from: env.charity, transact: true })
        );

    });

    test("should reject valid reveal from owner", async () => {
        
        await raise.run(state);

        const { env } = state;

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        await assert.isRejected(
            (await state.interfaces.seedom).reveal({
                message: env.charityMessage
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject valid reveal from participant", async () => {
        
        await raise.run(state);

        const { env } = state;
        const participant = state.accountAddresses[2];

        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        await assert.isRejected(
            (await state.interfaces.seedom).seed({
                message: env.charityMessage
            }, { from: participant, transact: true })
        );

    });

});