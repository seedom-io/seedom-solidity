const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const deploy = require('../script/simulation/deploy');
const seed = require('../script/simulation/seed');
const participate = require('../script/simulation/participate');
const raise = require('../script/simulation/raise');
const reveal = require('../script/simulation/reveal');
const end = require('../script/simulation/end');

suite('cancel', (state) => {

    const testCancelSuccess = async (account) => {
        
        const { env } = state;
        const seedom = await state.interfaces.seedom;
        // after deploy, cancel should never be true
        let actualState = await seedom.state({ from: account });
        assert.isNotOk(actualState.cancelled);

        await assert.isFulfilled(
            seedom.cancel({ from: account, transact: true })
        );

        actualState = await seedom.state({ from: account });
        assert.isOk(actualState.cancelled);

    };

    const testCancelFail = async (account) => {
        
        const { env } = state;
        const seedom = await state.interfaces.seedom;
        // after deploy, cancel should never be true
        let actualState = await seedom.state({ from: account });
        assert.isNotOk(actualState.cancelled);

        await assert.isRejected(
            seedom.cancel({ from: account, transact: true })
        );

        actualState = await seedom.state({ from: account });
        assert.isNotOk(actualState.cancelled);

    };

    test("should cancel (by owner) after deploy", async () => {
        await deploy.run(state);
        await testCancelSuccess(state.env.owner);
    });

    test("should cancel (by charity) after deploy", async () => {
        await deploy.run(state);
        await testCancelSuccess(state.env.charity);
    });

    test("should reject cancel (by participant) after deploy", async () => {
        await deploy.run(state);
        const participant = state.accountAddresses[2];
        await testCancelFail(participant);
    });

    test("should cancel (by owner) after seed", async () => {
        await seed.run(state);
        await testCancelSuccess(state.env.owner);
    });

    test("should cancel (by charity) after seed", async () => {
        await seed.run(state);
        await testCancelSuccess(state.env.charity);
    });

    test("should reject cancel (by participant) after seed", async () => {
        await seed.run(state);
        const participant = state.accountAddresses[2];
        await testCancelFail(participant);
    });

    test("should cancel (by owner) after raise", async () => {
        await raise.run(state);
        await testCancelSuccess(state.env.owner);
    });

    test("should cancel (by charity) after raise", async () => {
        await raise.run(state);
        await testCancelSuccess(state.env.charity);
    });

    test("should cancel (by owner) after reveal", async () => {
        await reveal.run(state);
        await testCancelSuccess(state.env.owner);
    });

    test("should cancel (by charity) after reveal", async () => {
        await reveal.run(state);
        await testCancelSuccess(state.env.charity);
    });

    test("should reject cancel (from owner) after end", async () => {
        await end.run(state);
        await testCancelFail(state.env.owner);
    });

    test("should reject cancel (from charity) after end", async () => {
        await end.run(state);
        await testCancelFail(state.env.charity);
    });

    test("should reject cancel (from participant) after end", async () => {
        await end.run(state);
        const participant = state.accountAddresses[2];
        await testCancelFail(participant);
    });

    const testCancelSuccessAfterExpiration = async (account) => {
        const now = ch.timestamp();
        await cli.progress("waiting for expiration time", state.env.expireTime - now);
        await testCancelSuccess(account);
    };

    test("should cancel (from participant) after expiration", async () => {
        await reveal.run(state);
        await testCancelSuccessAfterExpiration(state.env.participants[0].address);
    });

    test("should cancel (by owner) and refund after expiration", async () => {
        await reveal.run(state);
        await testCancelSuccessAfterExpiration(state.env.owner);
    });

    test("should cancel (by charity) and refund after expiration", async () => {
        await reveal.run(state);
        await testCancelSuccessAfterExpiration(state.env.charity);
    });

});
