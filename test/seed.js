const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const kickoff = require('../stage/kickoff');

suite('seed', (state) => {

    test("should seed properly from charity", async () => {

        await kickoff.stage(state);

        const stage = state.stage;

        const actualRaiser = await stage.instances.seedom.methods.currentRaiser().call({ from: stage.owner });

        assert.equalIgnoreCase(actualRaiser._charity, stage.charity, "charity does not match");

        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, stage.charity);

        const method = stage.instances.seedom.methods.seed(charityHashedRandom);
        await assert.isFulfilled(
            parity.sendMethod(method, { from: stage.charity })
        );

        const actualCharityHashedRandom = await stage.instances.seedom.methods.charityHashedRandom().call({ from: state.accountAddresses[2] });

        assert.equal(actualCharityHashedRandom, charityHashedRandom, "charity's hashed random does not match");

    });

    test("should reject seed from owner", async () => {
        
        await kickoff.stage(state);

        const stage = state.stage;
        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, stage.charity);

        const method = stage.instances.seedom.methods.seed(charityHashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: stage.owner }),
            parity.SomethingThrown
        );

    });

    test("should reject seed from participant", async () => {
        
        await kickoff.stage(state);

        const stage = state.stage;
        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, stage.charity);
        const participant = state.accountAddresses[2];

        const method = stage.instances.seedom.methods.seed(charityHashedRandom);
        await assert.isRejected(
            parity.sendMethod(method, { from: participant }),
            parity.SomethingThrown
        );

    });

});