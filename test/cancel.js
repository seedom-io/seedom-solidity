const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const networks = require('../chronicle/networks');
const instantiate = require('../stage/instantiate');
const seed = require('../stage/seed');
const participate = require('../stage/participate');
const raise = require('../stage/raise');
const reveal = require('../stage/reveal');
const end = require('../stage/end');

suite('cancel', (state) => {

    const testCancelSuccess = async (account) => {
        
        const stage = state.stage;
        // after instantiate, cancel should never be true
        let actualState = await stage.seedom.methods.state().call({ from: account });
        assert.isNotOk(actualState._cancelled);

        const method = stage.seedom.methods.cancel();
        await assert.isFulfilled(
            networks.sendMethod(method, { from: account }, state)
        );

        actualState = await stage.seedom.methods.state().call({ from: account });
        assert.isOk(actualState._cancelled);

    };

    const testCancelFail = async (account) => {
        
        const stage = state.stage;
        // after instantiate, cancel should never be true
        let actualState = await stage.seedom.methods.state().call({ from: account });
        assert.isNotOk(actualState._cancelled);

        const method = stage.seedom.methods.cancel();
        await assert.isRejected(
            networks.sendMethod(method, { from: account }, state)
        );

        actualState = await stage.seedom.methods.state().call({ from: account });
        assert.isNotOk(actualState._cancelled);

    };

    test("should cancel (by owner) after instantiate", async () => {

        // first instantiate
        await instantiate.stage(state);
        const stage = state.stage;
        await testCancelSuccess(stage.owner);

    });

    test("should cancel (by charity) after instantiate", async () => {

        // first instantiate
        await instantiate.stage(state);
        const stage = state.stage;
        await testCancelSuccess(stage.charity);

    });

    test("should reject cancel (by participant) after instantiate", async () => {

        // first instantiate
        await instantiate.stage(state);
        const participant = state.accountAddresses[2];
        await testCancelFail(participant);

    });

    test("should cancel (by owner) after seed", async () => {

        // first seed
        await seed.stage(state);
        const stage = state.stage;
        await testCancelSuccess(stage.owner);

    });

    test("should cancel (by charity) after seed", async () => {
        
        // first seed
        await seed.stage(state);
        const stage = state.stage;
        await testCancelSuccess(stage.charity);

    });

    test("should reject cancel (by participant) after seed", async () => {
        
        // first Instantiate
        await seed.stage(state);
        const participant = state.accountAddresses[2];
        await testCancelFail(participant);

    });

    test("should cancel (by owner) after raise", async () => {

        // first raise
        await raise.stage(state);
        const stage = state.stage;
        await testCancelSuccess(stage.owner);

    });

    test("should cancel (by charity) after raise", async () => {
        
        // first raise
        await raise.stage(state);
        const stage = state.stage;
        await testCancelSuccess(stage.charity);

    });

    test("should cancel (by owner) after revelation", async () => {

        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelSuccess(stage.owner);

    });

    test("should cancel (by charity) after revelation", async () => {
        
        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelSuccess(stage.charity);

    });

    test("should reject cancel (from owner) after end", async () => {

        // first end
        await end.stage(state);
        const stage = state.stage;
        await testCancelFail(stage.owner);

    });

    test("should reject cancel (from charity) after end", async () => {
        
        // first end
        await end.stage(state);
        const stage = state.stage;
        await testCancelFail(stage.charity);

    });

    test("should reject cancel (from participant) after end", async () => {
        
        // first end
        await end.stage(state);
        const participant = state.accountAddresses[2];
        await testCancelFail(participant);

    });

    const testCancelSuccessAfterExpiration = async (account) => {

        const stage = state.stage;
        const now = ch.timestamp();
        const expireTime = stage.expireTime;
        await cli.progress("waiting for expiration time", expireTime - now);
        await testCancelSuccess(account);

    };

    test("should cancel (from participant) after expiration", async () => {
        
        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelSuccessAfterExpiration(stage.participants[0].address);

    });

    test("should cancel (by owner) and refund after expiration", async () => {
        
        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelSuccessAfterExpiration(stage.owner);

    });

    test("should cancel (by charity) and refund after expiration", async () => {
        
        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelSuccessAfterExpiration(stage.charity);

    });

});
