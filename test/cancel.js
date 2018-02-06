const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const network = require('../chronicle/network');
const instantiate = require('../stage/instantiate');
const seed = require('../stage/seed');
const participate = require('../stage/participate');
const raise = require('../stage/raise');
const reveal = require('../stage/reveal');
const end = require('../stage/end');

suite('cancel', (state) => {

    const testCancelSuccess = async (account) => {
        
        const { env } = state;
        // after instantiate, cancel should never be true
        let actualState = await (await state.interfaces.seedom).state({ from: account });
        assert.isNotOk(actualState.cancelled);

        await (await state.interfaces.seedom).cancel();
        await assert.isFulfilled(
            network.sendMethod(method, { from: account }, state)
        );

        actualState = await (await state.interfaces.seedom).state({ from: account });
        assert.isOk(actualState.cancelled);

    };

    const testCancelFail = async (account) => {
        
        const { env } = state;
        // after instantiate, cancel should never be true
        let actualState = await (await state.interfaces.seedom).state({ from: account });
        assert.isNotOk(actualState.cancelled);

        await (await state.interfaces.seedom).cancel();
        await assert.isRejected(
            network.sendMethod(method, { from: account }, state)
        );

        actualState = await (await state.interfaces.seedom).state({ from: account });
        assert.isNotOk(actualState.cancelled);

    };

    test("should cancel (by owner) after instantiate", async () => {

        // first instantiate
        await instantiate.run(state);
        const { env } = state;
        await testCancelSuccess(env.owner);

    });

    test("should cancel (by charity) after instantiate", async () => {

        // first instantiate
        await instantiate.run(state);
        const { env } = state;
        await testCancelSuccess(env.charity);

    });

    test("should reject cancel (by participant) after instantiate", async () => {

        // first instantiate
        await instantiate.run(state);
        const participant = state.accountAddresses[2];
        await testCancelFail(participant);

    });

    test("should cancel (by owner) after seed", async () => {

        // first seed
        await seed.run(state);
        const { env } = state;
        await testCancelSuccess(env.owner);

    });

    test("should cancel (by charity) after seed", async () => {
        
        // first seed
        await seed.run(state);
        const { env } = state;
        await testCancelSuccess(env.charity);

    });

    test("should reject cancel (by participant) after seed", async () => {
        
        // first Instantiate
        await seed.run(state);
        const participant = state.accountAddresses[2];
        await testCancelFail(participant);

    });

    test("should cancel (by owner) after raise", async () => {

        // first raise
        await raise.run(state);
        const { env } = state;
        await testCancelSuccess(env.owner);

    });

    test("should cancel (by charity) after raise", async () => {
        
        // first raise
        await raise.run(state);
        const { env } = state;
        await testCancelSuccess(env.charity);

    });

    test("should cancel (by owner) after revelation", async () => {

        // first reveal
        await reveal.run(state);
        const { env } = state;
        await testCancelSuccess(env.owner);

    });

    test("should cancel (by charity) after revelation", async () => {
        
        // first reveal
        await reveal.run(state);
        const { env } = state;
        await testCancelSuccess(env.charity);

    });

    test("should reject cancel (from owner) after end", async () => {

        // first end
        await end.run(state);
        const { env } = state;
        await testCancelFail(env.owner);

    });

    test("should reject cancel (from charity) after end", async () => {
        
        // first end
        await end.run(state);
        const { env } = state;
        await testCancelFail(env.charity);

    });

    test("should reject cancel (from participant) after end", async () => {
        
        // first end
        await end.run(state);
        const participant = state.accountAddresses[2];
        await testCancelFail(participant);

    });

    const testCancelSuccessAfterExpiration = async (account) => {

        const { env } = state;
        const now = ch.timestamp();
        const expireTime = env.expireTime;
        await cli.progress("waiting for expiration time", expireTime - now);
        await testCancelSuccess(account);

    };

    test("should cancel (from participant) after expiration", async () => {
        
        // first reveal
        await reveal.run(state);
        const { env } = state;
        await testCancelSuccessAfterExpiration(env.participants[0].address);

    });

    test("should cancel (by owner) and refund after expiration", async () => {
        
        // first reveal
        await reveal.run(state);
        const { env } = state;
        await testCancelSuccessAfterExpiration(env.owner);

    });

    test("should cancel (by charity) and refund after expiration", async () => {
        
        // first reveal
        await reveal.run(state);
        const { env } = state;
        await testCancelSuccessAfterExpiration(env.charity);

    });

});
