const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const parity = require('../chronicle/parity');
const deploy = require('../script/simulation/deploy');
const network = require('../chronicle/network');

suite('seed', (state) => {

    test("should seed properly from charity", async () => {

        await deploy.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        const actualRaiser = await seedom.raiser({ from: env.owner });
        assert.equalIgnoreCase(actualRaiser.charity, env.charity, "charity does not match");

        const charityMessage = sh.messageHex();
        const charitySecret = sh.hashMessage(charityMessage, env.charity);

        await assert.isFulfilled(
            seedom.seed({
                secret: charitySecret
            }, { from: env.charity, transact: true })
        );

        const actualState = await seedom.state({ from: env.owner });

        assert.equal(actualState.charitySecret, charitySecret, "charity secret does not match");
        assert.equal(actualState.charityMessage, 0, "charity message zero");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.winner, 0, "winner zero");
        assert.equal(actualState.winnerMessage, 0, "winner message zero");
        assert.isNotOk(actualState.winnerWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, 0, "total participants zero");
        assert.equal(actualState.totalEntries, 0, "total entries zero");

    });

    test("should reject multiple valid seeds from charity", async () => {
        
        await deploy.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;
        const charityMessage = sh.messageHex();
        const charitySecret = sh.hashMessage(charityMessage, env.charity);

        await assert.isFulfilled(
            seedom.seed({
                secret: charitySecret
            }, { from: env.charity, transact: true })
        );

        await assert.isRejected(
            seedom.seed({
                secret: charitySecret
            }, { from: env.charity, transact: true })
        );

    });

    test("should reject valid seed from owner", async () => {
        
        await deploy.run(state);

        const { env } = state;
        const charityMessage = sh.messageHex();
        const charitySecret = sh.hashMessage(charityMessage, env.charity);

        await assert.isRejected(
            (await state.interfaces.seedom).seed({
                secret: charitySecret
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject seed from participant", async () => {
        
        await deploy.run(state);

        const { env } = state;
        const charityMessage = sh.messageHex();
        const charitySecret = sh.hashMessage(charityMessage, env.charity);
        const participant = state.accountAddresses[2];

        await assert.isRejected(
            (await state.interfaces.seedom).seed({
                secret: charitySecret
            }, { from: participant, transact: true })
        );

    });

});