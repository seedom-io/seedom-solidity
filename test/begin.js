const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const parity = require('../chronicle/parity');
const deploy = require('../script/simulation/deploy');
const network = require('../chronicle/network');
const m = require('../../seedom-crypter/messages');

suite('begin', (state) => {

    test("should begin properly from cause", async () => {

        await deploy.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        const actualDeployment = await fundraiser.deployment({ from: env.owner });
        assert.equalIgnoreCase(actualDeployment.cause, env.cause, "cause does not match");

        const causeMessage = m.random();
        const causeSecret = m.hash(causeMessage, env.cause);

        await assert.isFulfilled(
            fundraiser.begin({
                secret: causeSecret
            }, { from: env.cause, transact: true })
        );

        const actualState = await fundraiser.state({ from: env.owner });

        assert.equal(actualState.causeSecret, causeSecret, "cause secret does not match");
        assert.equal(actualState.causeMessage, 0, "cause message zero");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, 0, "total participants zero");
        assert.equal(actualState.entries, 0, "total entries zero");

    });

    test("should reject multiple valid begins from cause", async () => {
        
        await deploy.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;
        const causeMessage = m.random();
        const causeSecret = m.hash(causeMessage, env.cause);

        await assert.isFulfilled(
            fundraiser.begin({
                secret: causeSecret
            }, { from: env.cause, transact: true })
        );

        await assert.isRejected(
            fundraiser.begin({
                secret: causeSecret
            }, { from: env.cause, transact: true })
        );

    });

    test("should reject valid begin from owner", async () => {
        
        await deploy.run(state);

        const { env } = state;
        const causeMessage = m.random();
        const causeSecret = m.hash(causeMessage, env.cause);

        await assert.isRejected(
            (await state.interfaces.fundraiser).begin({
                secret: causeSecret
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject begin from participant", async () => {
        
        await deploy.run(state);

        const { env } = state;
        const causeMessage = m.random();
        const causeSecret = m.hash(causeMessage, env.cause);
        const participant = state.accountAddresses[4];

        await assert.isRejected(
            (await state.interfaces.fundraiser).begin({
                secret: causeSecret
            }, { from: participant, transact: true })
        );

    });

});