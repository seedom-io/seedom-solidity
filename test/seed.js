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

        const charityRandom = sh.randomHex();
        const charityHashedRandom = sh.hashRandom(charityRandom, env.charity);

        await assert.isFulfilled(
            seedom.seed({
                charityHashedRandom
            }, { from: env.charity, transact: true })
        );

        const actualState = await seedom.state({ from: env.owner });
        assert.equal(actualState.charityHashedRandom, charityHashedRandom, "charity's hashed random does not match");
        assert.equal(actualState.winner, 0, "winner not zero");
        assert.equal(actualState.charityRandom, 0, "charity random not zero");

    });

    test("should reject seed from owner", async () => {
        
        await deploy.run(state);

        const { env } = state;
        const charityRandom = sh.randomHex();
        const charityHashedRandom = sh.hashRandom(charityRandom, env.charity);

        await assert.isRejected(
            (await state.interfaces.seedom).seed({
                charityHashedRandom
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject seed from participant", async () => {
        
        await deploy.run(state);

        const { env } = state;
        const charityRandom = sh.randomHex();
        const charityHashedRandom = sh.hashRandom(charityRandom, env.charity);
        const participant = state.accountAddresses[2];

        await assert.isRejected(
            (await state.interfaces.seedom).seed({
                charityHashedRandom
            }, { from: participant, transact: true })
        );

    });

});