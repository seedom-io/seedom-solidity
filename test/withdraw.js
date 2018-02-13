const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const sh = require('../script/helper');
const deploy = require('../script/simulation/deploy');
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

        // calculate expected rewards
        const charityReward = 10 * env.participantsCount * env.valuePerEntry * env.charitySplit / 1000;
        const winnerReward = 10 * env.participantsCount * env.valuePerEntry * env.winnerSplit / 1000;
        const ownerReward = 10 * env.participantsCount * env.valuePerEntry * env.ownerSplit / 1000;

        // get state
        const actualState = await seedom.state({ from: env.owner });

        // check balances
        const actualCharityReward = await seedom.balance({ from: env.charity });
        assert.equal(actualCharityReward, charityReward, "charity reward balance incorrect");
        const actualWinnerReward = await seedom.balance({ from: actualState.winner });
        assert.equal(actualWinnerReward, winnerReward, "winner reward balance incorrect");
        const actualOwnerReward = await seedom.balance({ from: env.owner });
        assert.equal(actualOwnerReward, ownerReward, "owner reward balance incorrect");

        // issue withdraws
        const charityWithdrawReceipt = await seedom.withdraw({ from: env.charity, transact: true });
        const winnerWithdrawReceipt = await seedom.withdraw({ from: actualState.winner, transact: true });
        const ownerWithdrawReceipt = await seedom.withdraw({ from: env.owner, transact: true });

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
        const winner = actualState.winner.toLowerCase();
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

            // check pre-balance
            let actualParticipantBalance = await seedom.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 10000, "participant pre-balance incorrect");

            // verify pre-participant
            let actualParticipant = await seedom.participantsMapping({
                address: participant.address
            }, { from: participant.address });
            assert.equal(actualParticipant.entries, 10, "participant pre-entries incorrect");

            // issue withdraw and update local balance
            const withdrawReceipt = await seedom.withdraw({ from: participant.address, transact: true });
            const withdrawGasUsed = withdrawReceipt.gasUsed;
            const withdrawTransactionCost = await sh.getTransactionCost(withdrawGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(withdrawTransactionCost).plus(10000); 

            // check post-balance
            actualParticipantBalance = await seedom.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 0, "participant pre-balance incorrect");

            // verify pre-participant
            actualParticipant = await seedom.participantsMapping({
                address: participant.address
            }, { from: participant.address });
            assert.equal(actualParticipant.entries, 0, "participant post-entries incorrect");

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

    test("should reject multiple withdraw attempts (from participant) after cancel", async () => {
        
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

    test("should reject multiple withdraw attempts (by charity) after end", async () => {
        
        const { env } = state;

        // set charity lowest so it can
        // have a chance at withdrawing twice
        env.charitySplit = 100
        env.winnerSplit = 450;
        env.ownerSplit = 450;
        await end.run(state);
        
        const seedom = await state.interfaces.seedom;

        await assert.isFulfilled(
            seedom.withdraw({ from: env.charity, transact: true })
        );
        await assert.isRejected(
            seedom.withdraw({ from: env.charity, transact: true })
        );

    });

    test("should reject multiple withdraw attempts (by winner) after end", async () => {
        
        const { env } = state;

        // set winner lowest so it can
        // have a chance at withdrawing twice
        env.winnerSplit = 100;
        env.charitySplit = 100
        env.ownerSplit = 450;
        await end.run(state);
        
        const seedom = await state.interfaces.seedom;

        // get state
        const actualState = await seedom.state({ from: env.owner });

        await assert.isFulfilled(
            seedom.withdraw({ from: actualState.winner, transact: true })
        );
        await assert.isRejected(
            seedom.withdraw({ from: actualState.winner, transact: true })
        );

    });

    test("should reject multiple withdraw attempts (by owner) after end", async () => {
        
        const { env } = state;

        // set winner lowest so it can
        // have a chance at withdrawing twice
        env.ownerSplit = 100;
        env.winnerSplit = 450;
        env.charitySplit = 450;
        await end.run(state);
        
        const seedom = await state.interfaces.seedom;

        await assert.isFulfilled(
            seedom.withdraw({ from: env.owner, transact: true })
        );
        await assert.isRejected(
            seedom.withdraw({ from: env.owner, transact: true })
        );

    });

});