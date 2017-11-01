const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const kickoff = require('../stage/kickoff');

suite('seed', (state) => {

    test("should seed properly from charity", async () => {

        await kickoff.stage(state);

        const stage = state.stage;

        const actualKickoff = await state.web3Instances.charity.methods.currentKick().call({ from: stage.owner });

        assert.equalIgnoreCase(actualKickoff._charity, stage.charity, "charity does not match");

        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, stage.charity);

        const transaction = state.web3Instances.charity.methods.seed(charityHashedRandom);
        await assert.isFulfilled(
            parity.sendAndCheck(state.web3, transaction, { from: stage.charity })
        )

        const actualCharityHashedRandom = await state.web3Instances.charity.methods.charityHashedRandom().call({ from: state.accountAddresses[2] });

        assert.equal(actualCharityHashedRandom, charityHashedRandom, "charity's hashed random does not match");

    });

    test("should reject seed from owner", async () => {
        
        await kickoff.stage(state);

        const stage = state.stage;
        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, stage.charity);

        const transaction = state.web3Instances.charity.methods.seed(charityHashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: stage.owner }),
            parity.SomethingThrown
        );

    });

    test("should reject seed from participant", async () => {
        
        await kickoff.stage(state);

        const stage = state.stage;
        const charityRandom = sh.random();
        const charityHashedRandom = sh.hashedRandom(charityRandom, stage.charity);
        const participant = state.accountAddresses[2];

        const transaction = state.web3Instances.charity.methods.seed(charityHashedRandom);
        await assert.isRejected(
            parity.sendAndCheck(state.web3, transaction, { from: participant }),
            parity.SomethingThrown
        );

    });

});