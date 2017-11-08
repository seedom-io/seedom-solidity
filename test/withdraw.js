const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const participate = require('../stage/participate');
const fund = require('../stage/fund');
const end = require('../stage/end');
const withdraw = require('../stage/withdraw');

suite('withdraw', (state) => {

    const maxTransactionGasUsed = 500000;

    test("should withdraw no funds after participation with no funding", async () => {

        // first participate
        await participate.stage(state);

        const stage = state.stage;

        const method = stage.instances.charity.methods.withdraw();
        await assert.isRejected(
            parity.sendMethod(method, { from: stage.owner }),
            parity.SomethingThrown
        );

        await assert.isRejected(
            parity.sendMethod(method, { from: stage.charity }),
            parity.SomethingThrown
        );

        for (let participant of stage.participants) {
            await assert.isRejected(
                parity.sendMethod(method, { from: participant.address }),
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

        // kickoff
        const kickoffGasUsed = stage.kickoffReceipt.gasUsed;
        assert.isBelow(kickoffGasUsed, maxTransactionGasUsed);
        const kickoffTransactionCost = await sh.getTransactionCost(kickoffGasUsed, state.web3);
        initialBalances[stage.owner] = initialBalances[stage.owner].minus(kickoffTransactionCost);

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

        // fund
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const fundReceipt = stage.fundReceipts[i];
            const fundGasUsed = fundReceipt.gasUsed;
            assert.isBelow(fundGasUsed, maxTransactionGasUsed);
            const fundTransactionCost = await sh.getTransactionCost(fundGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(fundTransactionCost.plus(10000));
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

        const method = stage.instances.charity.methods.withdraw();
        // issue withdraws
        const charityWithdrawReceipt = await parity.sendMethod(method, { from: stage.charity });
        const winnerWithdrawReceipt = await parity.sendMethod(method, { from: stage.winner });
        const ownerWithdrawReceipt = await parity.sendMethod(method, { from: stage.owner });

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
        const method = stage.instances.charity.methods.cancel();
        const cancelReceipt = await parity.sendMethod(method, { from: account });
        const cancelGasUsed = cancelReceipt.gasUsed;
        assert.isBelow(cancelGasUsed, maxTransactionGasUsed);
        const cancelTransactionCost = await sh.getTransactionCost(cancelGasUsed, state.web3);
        initialBalances[account] = initialBalances[account].minus(cancelTransactionCost);

        // withdraw all participants
        for (let participant of stage.participants) {
            const method = stage.instances.charity.methods.withdraw();
            const receipt = await parity.sendMethod(method, { from: participant.address });
            const gasUsed = receipt.gasUsed;
            assert.isBelow(gasUsed, maxTransactionGasUsed);
            const transactionCost = await sh.getTransactionCost(gasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(transactionCost).plus(10000); 
        }

        // verify all balances are expected
        for (let accountAddress of state.accountAddresses) {
            const finalBalance = await sh.getBalance(accountAddress, state.web3);
            assert.equal(finalBalance.toString(), initialBalances[accountAddress].toString(), "withdraw balance not expected for " + accountAddress);
        }

    };

    test("should withdraw cancelled (by owner) participation funds", async () => {

        // first fund
        await fund.stage(state);
        const stage = state.stage;
        await testCancelWithdrawFunds(stage.owner);

    });

    test("should withdraw cancelled (by charity) participation funds", async () => {
        
        // first fund
        await fund.stage(state);
        const stage = state.stage;
        await testCancelWithdrawFunds(stage.charity);

    });

});