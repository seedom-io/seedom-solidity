const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const participate = require('../stage/participate');
const raise = require('../stage/raise');
const end = require('../stage/end');
const withdraw = require('../stage/withdraw');

suite('withdraw', (state) => {

    const maxTransactionGasUsed = 500000;

    test("should withdraw no ether after participation with no raising", async () => {

        // first participate
        await participate.stage(state);

        const stage = state.stage;

        const withdrawMethod = stage.seedom.methods.withdraw();
        await assert.isRejected(
            networks.sendMethod(withdrawMethod, { from: stage.owner }, state),
            parity.SomethingThrown
        );

        await assert.isRejected(
            networks.sendMethod(withdrawMethod, { from: stage.charity }, state),
            parity.SomethingThrown
        );

        for (let participant of stage.participants) {
            await assert.isRejected(
                networks.sendMethod(withdrawMethod, { from: participant.address }, state),
                parity.SomethingThrown
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

        // seed
        const seedGasUsed = stage.seedReceipt.gasUsed;
        assert.isBelow(seedGasUsed, maxTransactionGasUsed);
        const seedTransactionCost = await sh.getTransactionCost(seedGasUsed, state.web3);
        initialBalances[stage.charity] = initialBalances[stage.charity].minus(seedTransactionCost);

        // participate
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const participationReceipt = stage.participationReceipts[i];
            const participationGasUsed = participationReceipt.gasUsed;
            assert.isBelow(participationGasUsed, maxTransactionGasUsed);
            const participationTransactionCost = await sh.getTransactionCost(participationGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(participationTransactionCost);
        }

        // raise
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const raiseReceipt = stage.raiseReceipts[i];
            const raiseGasUsed = raiseReceipt.gasUsed;
            assert.isBelow(raiseGasUsed, maxTransactionGasUsed);
            const raiseTransactionCost = await sh.getTransactionCost(raiseGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(raiseTransactionCost.plus(10000));
        }

        // reveal
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const revealReceipt = stage.revealReceipts[i];
            const revealGasUsed = revealReceipt.gasUsed;
            assert.isBelow(revealGasUsed, maxTransactionGasUsed);
            const revealTransactionCost = await sh.getTransactionCost(revealGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(revealTransactionCost);
        }

        // end
        const endGasUsed = stage.endReceipt.gasUsed;
        assert.isBelow(endGasUsed, maxTransactionGasUsed);
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
        const charityWithdrawReceipt = await networks.sendMethod(method, { from: stage.charity }, state);
        const winnerWithdrawReceipt = await networks.sendMethod(method, { from: stage.winner }, state);
        const ownerWithdrawReceipt = await networks.sendMethod(method, { from: stage.owner }, state);

        // verify owner balance
        const ownerWithdrawGasUsed = ownerWithdrawReceipt.gasUsed;
        assert.isBelow(ownerWithdrawGasUsed, maxTransactionGasUsed);
        const ownerWithdrawTransactionCost = await sh.getTransactionCost(ownerWithdrawGasUsed, state.web3);
        initialBalances[stage.owner] = initialBalances[stage.owner].minus(ownerWithdrawTransactionCost).plus(stage.ownerBalance);

        // verify charity balance
        const charityWithdrawGasUsed = charityWithdrawReceipt.gasUsed;
        assert.isBelow(charityWithdrawGasUsed, maxTransactionGasUsed);
        const charityWithdrawTransactionCost = await sh.getTransactionCost(charityWithdrawGasUsed, state.web3);
        initialBalances[stage.charity] = initialBalances[stage.charity].minus(charityWithdrawTransactionCost).plus(stage.charityBalance);

        // verify winner balance
        const winnerWithdrawGasUsed = winnerWithdrawReceipt.gasUsed;
        assert.isBelow(winnerWithdrawGasUsed, maxTransactionGasUsed);
        const winnerWithdrawTransactionCost = await sh.getTransactionCost(winnerWithdrawGasUsed, state.web3);
        const winner = stage.winner.toLowerCase();
        initialBalances[winner] = initialBalances[winner].minus(winnerWithdrawTransactionCost).plus(stage.winnerBalance);

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
        const cancelReceipt = await networks.sendMethod(cancelMethod, { from: account }, state);
        const cancelGasUsed = cancelReceipt.gasUsed;
        assert.isBelow(cancelGasUsed, maxTransactionGasUsed);
        const cancelTransactionCost = await sh.getTransactionCost(cancelGasUsed, state.web3);
        initialBalances[account] = initialBalances[account].minus(cancelTransactionCost);

        // withdraw all participants
        for (let participant of stage.participants) {
            const withdrawMethod = stage.seedom.methods.withdraw();
            const withdrawReceipt = await networks.sendMethod(withdrawMethod, { from: participant.address }, state);
            const withdrawGasUsed = withdrawReceipt.gasUsed;
            assert.isBelow(withdrawGasUsed, maxTransactionGasUsed);
            const withdrawTransactionCost = await sh.getTransactionCost(withdrawGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(withdrawTransactionCost).plus(10000); 
        }

        // verify all balances are expected
        for (let accountAddress of state.accountAddresses) {
            const finalBalance = await sh.getBalance(accountAddress, state.web3);
            assert.equal(finalBalance.toString(), initialBalances[accountAddress].toString(), "withdraw balance not expected for " + accountAddress);
        }

    };

    test("should withdraw cancelled (by owner) participation ether", async () => {

        // first raise
        await raise.stage(state);
        const stage = state.stage;
        await testCancelWithdrawFunds(stage.owner);

    });

    test("should withdraw cancelled (by charity) participation ether", async () => {
        
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
        await networks.sendMethod(cancelMethod, { from: stage.owner }, state);

        // withdraw a single participant
        const participant = stage.participants[0];
        const withdrawMethod = stage.seedom.methods.withdraw();

        // initial withdraw
        await assert.isFulfilled(
            networks.sendMethod(withdrawMethod, { from: participant.address }, state)
        );

        // attempt second withdraw
        await assert.isRejected(
            networks.sendMethod(withdrawMethod, { from: participant.address }, state),
            parity.SomethingThrown
        );

    });

    test("should reject multiple withdraw attempts after end", async () => {
        
        // first raise
        await end.stage(state);

        const stage = state.stage;

        const withdrawMethod = stage.seedom.methods.withdraw();

        // initial withdraws
        await assert.isFulfilled(
            networks.sendMethod(withdrawMethod, { from: stage.charity }, state)
        );
        await assert.isFulfilled(
            networks.sendMethod(withdrawMethod, { from: stage.winner }, state)
        );
        await assert.isFulfilled(
            networks.sendMethod(withdrawMethod, { from: stage.owner }, state)
        );

        // attempt second withdraws
        await assert.isRejected(
            networks.sendMethod(withdrawMethod, { from: stage.charity }, state),
            parity.SomethingThrown
        );
        await assert.isRejected(
            networks.sendMethod(withdrawMethod, { from: stage.winner }, state),
            parity.SomethingThrown
        );
        await assert.isRejected(
            networks.sendMethod(withdrawMethod, { from: stage.owner }, state),
            parity.SomethingThrown
        );

    });

});