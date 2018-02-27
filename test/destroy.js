const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const network = require('../chronicle/network');
const raise = require('../script/simulation/raise');
const select = require('../script/simulation/select');
const BigNumber = require('bignumber.js');

suite('destroy', (state) => {

    test("should destroy (by owner) after destruct and send wei (to owner)", async () => {

        // first stage
        await raise.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        // get initial owner balance after raise
        const initialOwnerBalance = await sh.getBalance(env.owner, state.web3);

        // get contract balance after raise
        const contractAddress = seedom.receipt.contractAddress;
        const initialContractBalance = await sh.getBalance(contractAddress, state.web3);

        // ensure expected initial contract balance
        const expectedInitialContractBalance = new BigNumber(20 * env.participantsCount * env.valuePerEntry);
        assert.equal(initialContractBalance.toString(), expectedInitialContractBalance.toString(), "initial contract balance does not match expected");

        const now = ch.timestamp();
        await cli.progress("waiting for destruct time", env.destructTime - now);

        // destroy contract
        const destroyReceipt = await seedom.destroy({ from: env.owner, transact: true });
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
        await assert.isRejected(
            (await state.interfaces.seedom).destroy({ from: account, transact: true })
        );
    };

    test("should reject destroy (by owner) after expire", async () => {

        await select.run(state);

        const { env } = state;

        const now = ch.timestamp();
        await cli.progress("waiting for expiration time", env.expireTime - now);

        await testDestroyFail(env.owner);

    });

    test("should reject destroy (by charity) after destruct", async () => {

        await select.run(state);

        const { env } = state;

        const now = ch.timestamp();
        await cli.progress("waiting for destruct time", env.destructTime - now);

        await testDestroyFail(env.charity);

    });

    test("should reject destroy (by participant) after destruct", async () => {

        await select.run(state);

        const { env } = state;

        const now = ch.timestamp();
        await cli.progress("waiting for destruct time", env.destructTime - now);

        await testDestroyFail(env.participants[0].address);

    });

});
