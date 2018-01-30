const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const instantiate = require('../stage/instantiate');

suite('seed', (state) => {

    test("should seed properly from charity", async () => {

        await instantiate.stage(state);

        const stage = state.stage;

        const actualRaiser = await stage.seedom.methods.raiser().call({ from: stage.owner });
        assert.equalIgnoreCase(actualRaiser._charity, stage.charity, "charity does not match");

        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, stage.charity);
        const method = stage.seedom.methods.seed(charityHashedRandom);
        await assert.isFulfilled(
            networks.sendMethod(method, { from: stage.charity }, state)
        );

        const actualState = await stage.seedom.methods.state().call({ from: stage.owner });
        assert.equal(actualState._charityHashedRandom, charityHashedRandom, "charity's hashed random does not match");

    });

    test("should reject seed from owner", async () => {
        
        await instantiate.stage(state);

        const stage = state.stage;
        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, stage.charity);

        const method = stage.seedom.methods.seed(charityHashedRandom);
        await assert.isRejected(
            networks.sendMethod(method, { from: stage.owner }, state),
            networks.SomethingThrownException
        );

    });

    test("should reject seed from participant", async () => {
        
        await instantiate.stage(state);

        const stage = state.stage;
        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, stage.charity);
        const participant = state.accountAddresses[2];

        const method = stage.seedom.methods.seed(charityHashedRandom);
        await assert.isRejected(
            networks.sendMethod(method, { from: participant }, state),
            networks.SomethingThrownException
        );

    });

});