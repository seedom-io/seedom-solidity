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
        await participate.stage(state);

        const stage = state.stage;

        const withdrawMethod = stage.seedom.methods.withdraw();
        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: stage.owner }, state)
        );

        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: stage.charity }, state)
        );

        for (let participant of stage.participants) {
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
        await end.stage(state);

        const stage = state.stage;

        // instantiate
        const instantiateGasUsed = stage.instantiateReceipt.gasUsed;
        const instantiateTransactionCost = await sh.getTransactionCost(instantiateGasUsed, state.web3);
        initialBalances[stage.owner] = initialBalances[stage.owner].minus(instantiateTransactionCost);

        // seed
        const seedGasUsed = stage.seedReceipt.gasUsed;
        const seedTransactionCost = await sh.getTransactionCost(seedGasUsed, state.web3);
        initialBalances[stage.charity] = initialBalances[stage.charity].minus(seedTransactionCost);

        // participate
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const participationReceipt = stage.participationReceipts[i];
            const participationGasUsed = participationReceipt.gasUsed;
            const participationTransactionCost = await sh.getTransactionCost(participationGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(participationTransactionCost);
        }

        // raise
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const raiseReceipt = stage.raiseReceipts[i];
            const raiseGasUsed = raiseReceipt.gasUsed;
            const raiseTransactionCost = await sh.getTransactionCost(raiseGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(raiseTransactionCost.plus(10000));
        }

        // reveal
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const revealReceipt = stage.revealReceipts[i];
            const revealGasUsed = revealReceipt.gasUsed;
            const revealTransactionCost = await sh.getTransactionCost(revealGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(revealTransactionCost);
        }

        // end
        const endGasUsed = stage.endReceipt.gasUsed;
        const endTransactionCost = await sh.getTransactionCost(endGasUsed, state.web3);
        initialBalances[stage.charity] = initialBalances[stage.charity].minus(endTransactionCost);
        
        // verify all balances are expected
        for (let accountAddress of state.accountAddresses) {
            const finalBalance = await sh.getBalance(accountAddress, state.web3);
            assert.equal(finalBalance.toString(), initialBalances[accountAddress].toString(), "pre-withdraw balance not expected for " + accountAddress);
        }

    });

    test("should have correct post-withdraw balances", async () => {

        // first end
        await end.stage(state);

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        const stage = state.stage;

        const method = stage.seedom.methods.withdraw();
        // issue withdraws
        const charityWithdrawReceipt = await network.sendMethod(method, { from: stage.charity }, state);
        const winnerWithdrawReceipt = await network.sendMethod(method, { from: stage.winner }, state);
        const ownerWithdrawReceipt = await network.sendMethod(method, { from: stage.owner }, state);

        // calculate expected rewards
        const charityReward = 10 * stage.participantsCount * stage.valuePerEntry * stage.charitySplit / 1000;
        const winnerReward = 10 * stage.participantsCount * stage.valuePerEntry * stage.winnerSplit / 1000;
        const ownerReward = 10 * stage.participantsCount * stage.valuePerEntry * stage.ownerSplit / 1000;

        // verify owner balance
        const ownerWithdrawGasUsed = ownerWithdrawReceipt.gasUsed;
        const ownerWithdrawTransactionCost = await sh.getTransactionCost(ownerWithdrawGasUsed, state.web3);
        initialBalances[stage.owner] = initialBalances[stage.owner].minus(ownerWithdrawTransactionCost).plus(ownerReward);

        // verify charity balance
        const charityWithdrawGasUsed = charityWithdrawReceipt.gasUsed;
        const charityWithdrawTransactionCost = await sh.getTransactionCost(charityWithdrawGasUsed, state.web3);
        initialBalances[stage.charity] = initialBalances[stage.charity].minus(charityWithdrawTransactionCost).plus(charityReward);

        // verify winner balance
        const winnerWithdrawGasUsed = winnerWithdrawReceipt.gasUsed;
        const winnerWithdrawTransactionCost = await sh.getTransactionCost(winnerWithdrawGasUsed, state.web3);
        const winner = stage.winner.toLowerCase();
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

        const stage = state.stage;

        // now cancel
        const cancelMethod = stage.seedom.methods.cancel();
        const cancelReceipt = await network.sendMethod(cancelMethod, { from: account }, state);
        const cancelGasUsed = cancelReceipt.gasUsed;
        const cancelTransactionCost = await sh.getTransactionCost(cancelGasUsed, state.web3);
        initialBalances[account] = initialBalances[account].minus(cancelTransactionCost);

        // withdraw all participants
        for (let participant of stage.participants) {
            const withdrawMethod = stage.seedom.methods.withdraw();
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
        await raise.stage(state);
        const stage = state.stage;
        await testCancelWithdrawFunds(stage.owner);

    });

    test("should withdraw cancelled (by charity) participation wei", async () => {
        
        // first raise
        await raise.stage(state);
        const stage = state.stage;
        await testCancelWithdrawFunds(stage.charity);

    });

    test("should reject multiple withdraw attempts after cancel", async () => {
        
        // first raise
        await raise.stage(state);

        const stage = state.stage;

        // now cancel
        const cancelMethod = stage.seedom.methods.cancel();
        await network.sendMethod(cancelMethod, { from: stage.owner }, state);

        // withdraw a single participant
        const participant = stage.participants[0];
        const withdrawMethod = stage.seedom.methods.withdraw();

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
        await end.stage(state);

        const stage = state.stage;

        const withdrawMethod = stage.seedom.methods.withdraw();

        // initial withdraws
        await assert.isFulfilled(
            network.sendMethod(withdrawMethod, { from: stage.charity }, state)
        );
        await assert.isFulfilled(
            network.sendMethod(withdrawMethod, { from: stage.winner }, state)
        );
        await assert.isFulfilled(
            network.sendMethod(withdrawMethod, { from: stage.owner }, state)
        );

        // attempt second withdraws
        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: stage.charity }, state)
        );
        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: stage.winner }, state)
        );
        await assert.isRejected(
            network.sendMethod(withdrawMethod, { from: stage.owner }, state)
        );

    });

});