const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const sh = require('../script/helper');
const instantiate = require('../script/simulation/instantiate');
const participate = require('../script/simulation/participate');
const raise = require('../script/simulation/raise');
const end = require('../script/simulation/end');
const withdraw = require('../script/simulation/withdraw');

suite('withdraw', (state) => {

    test("should fail withdraw after participation", async () => {

        // first participate
        await participate.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        await assert.isRejected(
            seedom.withdraw({
                from: env.owner, transact: true
            })
        );

        await assert.isRejected(
            seedom.withdraw({
                from: env.charity, transact: true
            })
        );

        for (let participant of env.participants) {
            await assert.isRejected(
                seedom.withdraw({
                    from: participant.address, transact: true
                })
            )
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

        // deploy
        const deployGasUsed = env.deployReceipt.gasUsed;
        const deployTransactionCost = await sh.getTransactionCost(deployGasUsed, state.web3);
        initialBalances[env.owner] = initialBalances[env.owner].minus(deployTransactionCost);

        // seed
        const seedGasUsed = env.seedReceipt.gasUsed;
        const seedTransactionCost = await sh.getTransactionCost(seedGasUsed, state.web3);
        initialBalances[env.charity] = initialBalances[env.charity].minus(seedTransactionCost);

        // participate
        for (let participant of env.participants) {
            const participateGasUsed = participant.participateReceipt.gasUsed;
            const participateTransactionCost = await sh.getTransactionCost(participateGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(participateTransactionCost);
        }

        // raise
        for (let participant of env.participants) {
            const raiseGasUsed = participant.raiseReceipt.gasUsed;
            const raiseTransactionCost = await sh.getTransactionCost(raiseGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(raiseTransactionCost.plus(10000));
        }

        // reveal
        for (let participant of env.participants) {
            const revealGasUsed = participant.revealReceipt.gasUsed;
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
        const seedom = await state.interfaces.seedom;

        // issue withdraws
        const charityWithdrawReceipt = await seedom.withdraw({
            from: env.charity, transact: true
        });
    
        const winnerWithdrawReceipt = await seedom.withdraw({
            from: env.winner, transact: true
        });
    
        const ownerWithdrawReceipt = await seedom.withdraw({
            from: env.owner, transact: true
        });

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
        const seedom = await state.interfaces.seedom;

        // now cancel
        const cancelReceipt = await seedom.cancel({ from: account, transact: true });
        const cancelGasUsed = cancelReceipt.gasUsed;
        const cancelTransactionCost = await sh.getTransactionCost(cancelGasUsed, state.web3);
        initialBalances[account] = initialBalances[account].minus(cancelTransactionCost);

        // withdraw all participants
        for (let participant of env.participants) {
            const withdrawReceipt = await seedom.withdraw({ from: participant.address, transact: true });
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
        await raise.run(state);
        await testCancelWithdrawFunds(state.env.owner);
    });

    test("should withdraw cancelled (by charity) participation wei", async () => {
        await raise.run(state);
        await testCancelWithdrawFunds(state.env.charity);
    });

    test("should reject multiple withdraw attempts after cancel", async () => {
        
        // first raise
        await raise.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        // now cancel
        await seedom.cancel({ from: env.owner, transact: true });

        // withdraw a single participant
        const participant = env.participants[0];

        // initial withdraw
        await assert.isFulfilled(
            seedom.withdraw({ from: participant.address, transact: true })
        );

        // attempt second withdraw
        await assert.isRejected(
            seedom.withdraw({ from: participant.address, transact: true })
        );

    });

    test("should reject multiple withdraw attempts after end", async () => {
        
        await end.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        // initial withdraws
        await assert.isFulfilled(
            seedom.withdraw({ from: env.charity, transact: true })
        );
        await assert.isFulfilled(
            seedom.withdraw({ from: env.winner, transact: true })
        );
        await assert.isFulfilled(
            seedom.withdraw({ from: env.owner, transact: true })
        );

        // attempt second withdraws
        await assert.isRejected(
            seedom.withdraw({ from: env.charity, transact: true })
        );
        await assert.isRejected(
            seedom.withdraw({ from: env.winner, transact: true })
        );
        await assert.isRejected(
            seedom.withdraw({ from: env.owner, transact: true })
        );

    });

});