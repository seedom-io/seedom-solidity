const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const parity = require('../chronicle/parity');
const instantiate = require('../script/simulation/instantiate');
const network = require('../chronicle/network');

suite('seed', (state) => {

    test("should seed properly from charity", async () => {

        await instantiate.run(state);

        const { env } = state;

        const actualRaiser = await (await state.interfaces.seedom).raiser({ from: env.owner });
        assert.equalIgnoreCase(actualRaiser.charity, env.charity, "charity does not match");

        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, env.charity);

        await assert.isFulfilled(
            (await state.interfaces.seedom).seed({
                charityHashedRandom
            }, { from: env.charity, transact: true })
        );

        const actualState = await (await state.interfaces.seedom).state({ from: env.owner });
        assert.equal(actualState.charityHashedRandom, charityHashedRandom, "charity's hashed random does not match");

    });

    test("should reject seed from owner", async () => {
        
        await instantiate.run(state);

        const { env } = state;
        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, env.charity);

        await assert.isRejected(
            (await state.interfaces.seedom).seed({
                charityHashedRandom
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject seed from participant", async () => {
        
        await instantiate.run(state);

        const { env } = state;
        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, env.charity);
        const participant = state.accountAddresses[2];

        await assert.isRejected(
            (await state.interfaces.seedom).seed({
                charityHashedRandom
            }, { from: participant, transact: true })
        );

    });

});