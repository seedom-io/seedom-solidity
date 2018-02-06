const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const network = require('../chronicle/network');
const participate = require('../stage/participate');
const raise = require('../stage/raise');
const end = require('../stage/end');
const withdraw = require('../stage/withdraw');

suite('withdraw', (state) => {

    test("should fail withdraw after participation", async () => {

        // first participate
        await participate.run(state);

        const { env } = state;

        const withdrawMethod = env.seedom.methods.withdraw();
        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: env.owner }, state)
        );

        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: env.charity }, state)
        );

        for (let participant of env.participants) {
            await assert.isRejected(
                network.sendMethod(withdrawMethod, { from: participant.address }, state)
            );
        }

    });

    test("should have correct pre-withdraw balances", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        // first end
        await end.run(state);

        const { env } = state;

        // instantiate
        const instantiateGasUsed = env.instantiateReceipt.gasUsed;
        const instantiateTransactionCost = await sh.getTransactionCost(instantiateGasUsed, state.web3);
        initialBalances[env.owner] = initialBalances[env.owner].minus(instantiateTransactionCost);

        // seed
        const seedGasUsed = env.seedReceipt.gasUsed;
        const seedTransactionCost = await sh.getTransactionCost(seedGasUsed, state.web3);
        initialBalances[env.charity] = initialBalances[env.charity].minus(seedTransactionCost);

        // participate
        for (let i = 0; i < env.participantsCount; i++) {
            const participant = env.participants[i];
            const participationReceipt = env.participationReceipts[i];
            const participationGasUsed = participationReceipt.gasUsed;
            const participationTransactionCost = await sh.getTransactionCost(participationGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(participationTransactionCost);
        }

        // raise
        for (let i = 0; i < env.participantsCount; i++) {
            const participant = env.participants[i];
            const raiseReceipt = env.raiseReceipts[i];
            const raiseGasUsed = raiseReceipt.gasUsed;
            const raiseTransactionCost = await sh.getTransactionCost(raiseGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(raiseTransactionCost.plus(10000));
        }

        // reveal
        for (let i = 0; i < env.participantsCount; i++) {
            const participant = env.participants[i];
            const revealReceipt = env.revealReceipts[i];
            const revealGasUsed = revealReceipt.gasUsed;
            const revealTransactionCost = await sh.getTransactionCost(revealGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(revealTransactionCost);
        }

        // end
        const endGasUsed = env.endReceipt.gasUsed;
        const endTransactionCost = await sh.getTransactionCost(endGasUsed, state.web3);
        initialBalances[env.charity] = initialBalances[env.charity].minus(endTransactionCost);
        
        // verify all balances are expected
        for (let accountAddress of state.accountAddresses) {
            const finalBalance = await sh.getBalance(accountAddress, state.web3);
            assert.equal(finalBalance.toString(), initialBalances[accountAddress].toString(), "pre-withdraw balance not expected for " + accountAddress);
        }

    });

    test("should have correct post-withdraw balances", async () => {

        // first end
        await end.run(state);

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        const { env } = state;

        await (await state.interfaces.seedom).withdraw();
        // issue withdraws
        const charityWithdrawReceipt = await network.sendMethod(method, { from: env.charity }, state);
        const winnerWithdrawReceipt = await network.sendMethod(method, { from: env.winner }, state);
        const ownerWithdrawReceipt = await network.sendMethod(method, { from: env.owner }, state);

        // calculate expected rewards
        const charityReward = 10 * env.participantsCount * env.valuePerEntry * env.charitySplit / 1000;
        const winnerReward = 10 * env.participantsCount * env.valuePerEntry * env.winnerSplit / 1000;
        const ownerReward = 10 * env.participantsCount * env.valuePerEntry * env.ownerSplit / 1000;

        // verify owner balance
        const ownerWithdrawGasUsed = ownerWithdrawReceipt.gasUsed;
        const ownerWithdrawTransactionCost = await sh.getTransactionCost(ownerWithdrawGasUsed, state.web3);
        initialBalances[env.owner] = initialBalances[env.owner].minus(ownerWithdrawTransactionCost).plus(ownerReward);

        // verify charity balance
        const charityWithdrawGasUsed = charityWithdrawReceipt.gasUsed;
        const charityWithdrawTransactionCost = await sh.getTransactionCost(charityWithdrawGasUsed, state.web3);
        initialBalances[env.charity] = initialBalances[env.charity].minus(charityWithdrawTransactionCost).plus(charityReward);

        // verify winner balance
        const winnerWithdrawGasUsed = winnerWithdrawReceipt.gasUsed;
        const winnerWithdrawTransactionCost = await sh.getTransactionCost(winnerWithdrawGasUsed, state.web3);
        const winner = env.winner.toLowerCase();
        initialBalances[winner] = initialBalances[winner].minus(winnerWithdrawTransactionCost).plus(winnerReward);

        // verify all balances are expected
        for (let accountAddress of state.accountAddresses) {
            const finalBalance = await sh.getBalance(accountAddress, state.web3);
            assert.equal(finalBalance.toString(), initialBalances[accountAddress].toString(), "withdraw balance not expected for " + accountAddress);
        }

    });

    const testCancelWithdrawFunds = async (account) => {
        
        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        const { env } = state;

        // now cancel
        const cancelMethod = env.seedom.methods.cancel();
        const cancelReceipt = await network.sendMethod(cancelMethod, { from: account }, state);
        const cancelGasUsed = cancelReceipt.gasUsed;
        const cancelTransactionCost = await sh.getTransactionCost(cancelGasUsed, state.web3);
        initialBalances[account] = initialBalances[account].minus(cancelTransactionCost);

        // withdraw all participants
        for (let participant of env.participants) {
            const withdrawMethod = env.seedom.methods.withdraw();
            const withdrawReceipt = await network.sendMethod(withdrawMethod, { from: participant.address }, state);
            const withdrawGasUsed = withdrawReceipt.gasUsed;
            const withdrawTransactionCost = await sh.getTransactionCost(withdrawGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(withdrawTransactionCost).plus(10000); 
        }

        // verify all balances are expected
        for (let accountAddress of state.accountAddresses) {
            const finalBalance = await sh.getBalance(accountAddress, state.web3);
            assert.equal(finalBalance.toString(), initialBalances[accountAddress].toString(), "withdraw balance not expected for " + accountAddress);
        }

    };

    test("should withdraw cancelled (by owner) participation wei", async () => {

        // first raise
        await raise.run(state);
        const { env } = state;
        await testCancelWithdrawFunds(env.owner);

    });

    test("should withdraw cancelled (by charity) participation wei", async () => {
        
        // first raise
        await raise.run(state);
        const { env } = state;
        await testCancelWithdrawFunds(env.charity);

    });

    test("should reject multiple withdraw attempts after cancel", async () => {
        
        // first raise
        await raise.run(state);

        const { env } = state;

        // now cancel
        const cancelMethod = env.seedom.methods.cancel();
        await network.sendMethod(cancelMethod, { from: env.owner }, state);

        // withdraw a single participant
        const participant = env.participants[0];
        const withdrawMethod = env.seedom.methods.withdraw();

        // initial withdraw
        await assert.isFulfilled(
            network.sendMethod(withdrawMethod, { from: participant.address }, state)
        );

        // attempt second withdraw
        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: participant.address }, state)
        );

    });

    test("should reject multiple withdraw attempts after end", async () => {
        
        // first raise
        await end.run(state);

        const { env } = state;

        const withdrawMethod = env.seedom.methods.withdraw();

        // initial withdraws
        await assert.isFulfilled(
            network.sendMethod(withdrawMethod, { from: env.charity }, state)
        );
        await assert.isFulfilled(
            network.sendMethod(withdrawMethod, { from: env.winner }, state)
        );
        await assert.isFulfilled(
            network.sendMethod(withdrawMethod, { from: env.owner }, state)
        );

        // attempt second withdraws
        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: env.charity }, state)
        );
        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: env.winner }, state)
        );
        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: env.owner }, state)
        );

    });

});