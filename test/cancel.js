const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const deploy = require('../script/simulation/deploy');
const begin = require('../script/simulation/begin');
const participate = require('../script/simulation/participate');
const raise = require('../script/simulation/raise');
const reveal = require('../script/simulation/reveal');
const end = require('../script/simulation/end');

suite('cancel', (state) => {

    const testCancelSuccess = async (account) => {
        
        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;
        // after deploy, cancel should never be true
        let actualState = await fundraiser.state({ from: account });
        assert.isNotOk(actualState.cancelled);

        await assert.isFulfilled(
            fundraiser.cancel({ from: account, transact: true })
        );

        actualState = await fundraiser.state({ from: account });
        assert.isOk(actualState.cancelled);

    };

    const testCancelFail = async (account) => {
        
        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;
        // after deploy, cancel should never be true
        let actualState = await fundraiser.state({ from: account });
        assert.isNotOk(actualState.cancelled);

        await assert.isRejected(
            fundraiser.cancel({ from: account, transact: true })
        );

        actualState = await fundraiser.state({ from: account });
        assert.isNotOk(actualState.cancelled);

    };

    test("should cancel (by owner) after deploy", async () => {
        await deploy.run(state);
        await testCancelSuccess(state.env.owner);
    });

    test("should cancel (by cause) after deploy", async () => {
        await deploy.run(state);
        await testCancelSuccess(state.env.cause);
    });

    test("should reject cancel (by participant) after deploy", async () => {
        await deploy.run(state);
        const participant = state.accountAddresses[4];
        await testCancelFail(participant);
    });

    test("should cancel (by owner) after begin", async () => {
        await begin.run(state);
        await testCancelSuccess(state.env.owner);
    });

    test("should cancel (by cause) after begin", async () => {
        await begin.run(state);
        await testCancelSuccess(state.env.cause);
    });

    test("should reject cancel (by participant) after begin", async () => {
        await begin.run(state);
        const participant = state.accountAddresses[4];
        await testCancelFail(participant);
    });

    test("should cancel (by owner) after raise", async () => {
        await raise.run(state);
        await testCancelSuccess(state.env.owner);
    });

    test("should cancel (by cause) after raise", async () => {
        await raise.run(state);
        await testCancelSuccess(state.env.cause);
    });

    test("should cancel (by owner) after reveal", async () => {
        await reveal.run(state);
        await testCancelSuccess(state.env.owner);
    });

    test("should cancel (by cause) after reveal", async () => {
        await reveal.run(state);
        await testCancelSuccess(state.env.cause);
    });

    test("should reject cancel (from owner) after select", async () => {
        await end.run(state);
        await testCancelFail(state.env.owner);
    });

    test("should reject cancel (from cause) after select", async () => {
        await end.run(state);
        await testCancelFail(state.env.cause);
    });

    test("should reject cancel (from participant) after select", async () => {
        await end.run(state);
        const participant = state.accountAddresses[4];
        await testCancelFail(participant);
    });

    const testCancelSuccessAfterExpiration = async (account) => {
        const now = ch.timestamp();
        await cli.progress("waiting for expiration time", state.env.expireTime - now, 1);
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

    test("should cancel (by cause) and refund after expiration", async () => {
        await reveal.run(state);
        await testCancelSuccessAfterExpiration(state.env.cause);
    });

});
