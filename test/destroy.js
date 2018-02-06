const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const network = require('../chronicle/network');
const raise = require('../stage/raise');
const end = require('../stage/end');
const BigNumber = require('bignumber.js');

suite('destroy', (state) => {

    test("should destroy (by owner) after destruct and send wei (to owner)", async () => {

        // first stage
        await raise.run(state);

        const { env } = state;

        // get initial owner balance after raise
        const initialOwnerBalance = await sh.getBalance(env.owner, state.web3);

        // get contract balance after raise
        const contractAddress = env.seedom.options.address;
        const initialContractBalance = await sh.getBalance(contractAddress, state.web3);

        // ensure expected initial contract balance
        const expectedInitialContractBalance = new BigNumber(10 * env.participantsCount * env.valuePerEntry);
        assert.equal(initialContractBalance.toString(), expectedInitialContractBalance.toString(), "initial contract balance does not match expected");

        const now = ch.timestamp();
        const destructTime = env.destructTime;
        await cli.progress("waiting for destruct time", destructTime - now);

        // destroy contract
        await (await state.interfaces.seedom).destroy();
        const destroyReceipt = await network.sendMethod(method, { from: env.owner }, state);
        const destroyTransactionCost = await sh.getTransactionCost(destroyReceipt.gasUsed, state.web3);

        // ensure expected final contract balance
        const finalContractBalance = await sh.getBalance(contractAddress, state.web3);
        assert.equal(finalContractBalance.toString(), "0", "final contract balance not zero");

        // ensure expected owner balance
        const expectedOwnerBalance = initialOwnerBalance.plus(expectedInitialContractBalance).minus(destroyTransactionCost);
        const ownerBalance = await sh.getBalance(env.owner, state.web3);
        assert.equal(ownerBalance.toString(), expectedOwnerBalance.toString(), "owner balance not expected");

    });

    const testDestroyFail = async (account) => {
        
        const { env } = state;
        await (await state.interfaces.seedom).destroy();
        await assert.isRejected(
            network.sendMethod(method, { from: account }, state)
        );

    };

    test("should reject destroy (by owner) after expire", async () => {

        // first end
        await end.run(state);

        const { env } = state;
        const now = ch.timestamp();
        const expireTime = env.expireTime;
        await cli.progress("waiting for expiration time", expireTime - now);
        await testDestroyFail(env.owner);

    });

    test("should reject destroy (by charity) after destruct", async () => {

        // first end
        await end.run(state);

        const { env } = state;
        const now = ch.timestamp();
        const destructTime = env.destructTime;
        await cli.progress("waiting for destruct time", destructTime - now);
        await testDestroyFail(env.charity);

    });

    test("should reject destroy (by participant) after destruct", async () => {

        // first end
        await end.run(state);

        const { env } = state;
        const now = ch.timestamp();
        const destructTime = env.destructTime;
        await cli.progress("waiting for destruct time", destructTime - now);
        await testDestroyFail(env.participants[0].address);

    });

});
