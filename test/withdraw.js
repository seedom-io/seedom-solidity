const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const sh = require('../stage/helper');
const parity = require('../chronicle/parity');
const participate = require('../stage/participate');
const fund = require('../stage/fund');
const end = require('../stage/end');
const withdraw = require('../stage/withdraw');
const BigNumber = require('bignumber.js');

suite('withdraw', (state) => {

    const maxTransactionGasUsed = 500000;

    const getBalance = async (address) => {
        const latestBlock = await state.web3.eth.getBlock('latest');
        const latestBlockNumber = latestBlock.number;
        const balance = await state.web3.eth.getBalance(address, latestBlockNumber);
        cli.info("%s has a balance of %s (block %d)", address, balance, latestBlockNumber);
        return new BigNumber(balance);
    };

    const calculateTransactionCost = (gasUsed, gasPrice) => {
        const transactionCost = gasUsed * gasPrice;
        cli.info("gas used %d; gas price %d; transaction cost %d", gasUsed, gasPrice, transactionCost);
        return new BigNumber(transactionCost);
    };

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
            initialBalances[accountAddress] = await getBalance(accountAddress);
        }

        // first end
        await end.stage(state);

        const stage = state.stage;

        // get latest gas price
        const gasPrice = await state.web3.eth.getGasPrice();

        // kickoff
        const kickoffGasUsed = stage.kickoffReceipt.gasUsed;
        assert.isBelow(kickoffGasUsed, maxTransactionGasUsed);
        const kickoffTransactionCost = calculateTransactionCost(kickoffGasUsed, gasPrice);
        initialBalances[stage.owner] = initialBalances[stage.owner].minus(kickoffTransactionCost);

        // seed
        const seedGasUsed = stage.seedReceipt.gasUsed;
        assert.isBelow(seedGasUsed, maxTransactionGasUsed);
        const seedTransactionCost = calculateTransactionCost(seedGasUsed, gasPrice);
        initialBalances[stage.charity] = initialBalances[stage.charity].minus(seedTransactionCost);

        // participate
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const participationReceipt = stage.participationReceipts[i];
            const participationGasUsed = participationReceipt.gasUsed;
            assert.isBelow(participationGasUsed, maxTransactionGasUsed);
            const participationTransactionCost = calculateTransactionCost(participationGasUsed, gasPrice);
            initialBalances[participant.address] = initialBalances[participant.address].minus(participationTransactionCost);
        }

        // fund
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const fundReceipt = stage.fundReceipts[i];
            const fundGasUsed = fundReceipt.gasUsed;
            assert.isBelow(fundGasUsed, maxTransactionGasUsed);
            const fundTransactionCost = calculateTransactionCost(fundGasUsed, gasPrice);
            initialBalances[participant.address] = initialBalances[participant.address].minus(fundTransactionCost.plus(10500));
        }

        // reveal
        for (let i = 0; i < stage.participantsCount; i++) {
            const participant = stage.participants[i];
            const revealReceipt = stage.revealReceipts[i];
            const revealGasUsed = revealReceipt.gasUsed;
            assert.isBelow(revealGasUsed, maxTransactionGasUsed);
            const revealTransactionCost = calculateTransactionCost(revealGasUsed, gasPrice);
            initialBalances[participant.address] = initialBalances[participant.address].minus(revealTransactionCost);
        }

        // end
        const endGasUsed = stage.endReceipt.gasUsed;
        assert.isBelow(endGasUsed, maxTransactionGasUsed);
        const endTransactionCost = calculateTransactionCost(endGasUsed, gasPrice);
        initialBalances[stage.charity] = initialBalances[stage.charity].minus(endTransactionCost);
        
        // verify all balances are expected
        for (let accountAddress of state.accountAddresses) {
            const finalBalance = await getBalance(accountAddress);
            assert.equal(finalBalance.toString(), initialBalances[accountAddress].toString(), "pre-withdraw balance not expected for " + accountAddress);
        }

    });

    test("should have correct post-withdraw balances", async () => {

        // first end
        await end.stage(state);

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await getBalance(accountAddress);
        }

        const stage = state.stage;

        const method = stage.instances.charity.methods.withdraw();
        // issue withdraws
        const charityWithdrawReceipt = await parity.sendMethod(method, { from: stage.charity });
        const winnerWithdrawReceipt = await parity.sendMethod(method, { from: stage.winner });
        const ownerWithdrawReceipt = await parity.sendMethod(method, { from: stage.owner });

        // get latest gas price
        const gasPrice = await state.web3.eth.getGasPrice();

        // verify owner balance
        const ownerWithdrawGasUsed = ownerWithdrawReceipt.gasUsed;
        assert.isBelow(ownerWithdrawGasUsed, maxTransactionGasUsed);
        const ownerWithdrawTransactionCost = calculateTransactionCost(ownerWithdrawGasUsed, gasPrice);
        initialBalances[stage.owner] = initialBalances[stage.owner].minus(ownerWithdrawTransactionCost).plus(stage.ownerBalance);

        // verify charity balance
        const charityWithdrawGasUsed = charityWithdrawReceipt.gasUsed;
        assert.isBelow(charityWithdrawGasUsed, maxTransactionGasUsed);
        const charityWithdrawTransactionCost = calculateTransactionCost(charityWithdrawGasUsed, gasPrice);
        initialBalances[stage.charity] = initialBalances[stage.charity].minus(charityWithdrawTransactionCost).plus(stage.charityBalance);

        // verify winner balance
        const winnerWithdrawGasUsed = winnerWithdrawReceipt.gasUsed;
        assert.isBelow(winnerWithdrawGasUsed, maxTransactionGasUsed);
        const winnerWithdrawTransactionCost = calculateTransactionCost(winnerWithdrawGasUsed, gasPrice);
        const winner = stage.winner.toLowerCase();
        initialBalances[winner] = initialBalances[winner].minus(winnerWithdrawTransactionCost).plus(stage.winnerBalance);

        // verify all balances are expected
        for (let accountAddress of state.accountAddresses) {
            const finalBalance = await getBalance(accountAddress);
            assert.equal(finalBalance.toString(), initialBalances[accountAddress].toString(), "withdraw balance not expected for " + accountAddress);
        }

    });

    const testCancelWithdrawFunds = async (account) => {
        
        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await getBalance(accountAddress);
        }

        const stage = state.stage;

        // get latest gas price
        const gasPrice = await state.web3.eth.getGasPrice();

        // now cancel
        const method = stage.instances.charity.methods.cancel();
        const cancelReceipt = await parity.sendMethod(method, { from: account });
        const cancelGasUsed = cancelReceipt.gasUsed;
        assert.isBelow(cancelGasUsed, maxTransactionGasUsed);
        const cancelTransactionCost = calculateTransactionCost(cancelGasUsed, gasPrice);
        initialBalances[account] = initialBalances[account].minus(cancelTransactionCost);

        // withdraw all participants
        for (let participant of stage.participants) {
            const method = stage.instances.charity.methods.withdraw();
            const receipt = await parity.sendMethod(method, { from: participant.address });
            const gasUsed = receipt.gasUsed;
            assert.isBelow(gasUsed, maxTransactionGasUsed);
            const transactionCost = calculateTransactionCost(gasUsed, gasPrice);
            initialBalances[participant.address] = initialBalances[participant.address].minus(transactionCost).plus(10500); 
        }

        // verify all balances are expected
        for (let accountAddress of state.accountAddresses) {
            const finalBalance = await getBalance(accountAddress);
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