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
        const fundraiser = await state.interfaces.fundraiser;

        await assert.isRejected(
            fundraiser.withdraw({
                from: env.owner, transact: true
            })
        );

        await assert.isRejected(
            fundraiser.withdraw({
                from: env.cause, transact: true
            })
        );

        for (let participant of env.participants) {
            await assert.isRejected(
                fundraiser.withdraw({
                    from: participant.address, transact: true
                })
            )
        }

    });

    test("should have correct pre-withdraw balances", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let key of state.network.keys) {
            initialBalances[key.address] = await sh.getBalance(key.address, state.web3);
        }

        await end.run(state);

        const { env } = state;

        // deploy (fundraiser)
        const fundraiserGasUsed = env.fundraiserReceipt.gasUsed;
        const fundraiserTransactionCost = await sh.getTransactionCost(fundraiserGasUsed, state.web3);
        initialBalances[env.owner] = initialBalances[env.owner].minus(fundraiserTransactionCost);

        // deploy (polling)
        const pollingGasUsed = env.pollingReceipt.gasUsed;
        const pollingTransactionCost = await sh.getTransactionCost(pollingGasUsed, state.web3);
        initialBalances[env.owner] = initialBalances[env.owner].minus(pollingTransactionCost);

        // begin
        const beginGasUsed = env.beginReceipt.gasUsed;
        const beginTransactionCost = await sh.getTransactionCost(beginGasUsed, state.web3);
        initialBalances[env.cause] = initialBalances[env.cause].minus(beginTransactionCost);

        // participate
        for (let participant of env.participants) {
            const participateGasUsed = participant.participateReceipt.gasUsed;
            const participateTransactionCost = await sh.getTransactionCost(participateGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(participateTransactionCost.plus(10000));
        }

        // raise
        for (let participant of env.participants) {
            const raiseGasUsed = participant.raiseReceipt.gasUsed;
            const raiseTransactionCost = await sh.getTransactionCost(raiseGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(raiseTransactionCost.plus(10000));
        }

        // reveal
        const revealGasUsed = env.revealReceipt.gasUsed;
        const revealTransactionCost = await sh.getTransactionCost(revealGasUsed, state.web3);
        initialBalances[env.owner] = initialBalances[env.owner].minus(revealTransactionCost);

        // end
        const endGasUsed = env.endReceipt.gasUsed;
        const endTransactionCost = await sh.getTransactionCost(endGasUsed, state.web3);
        initialBalances[env.cause] = initialBalances[env.cause].minus(endTransactionCost);
        
        // verify all balances are expected
        for (let key of state.network.keys) {
            const finalBalance = await sh.getBalance(key.address, state.web3);
            assert.equal(finalBalance.toString(), initialBalances[key.address].toString(), "pre-withdraw balance not expected for " + key.address);
        }

    });

    test("should have correct post-withdraw balances", async () => {

        await end.run(state);

        const initialBalances = {};
        // get all initial balances
        for (let key of state.network.keys) {
            initialBalances[key.address] = await sh.getBalance(key.address, state.web3);
        }

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        // calculate expected rewards
        const causeReward = 20 * env.participantsCount * env.valuePerEntry * env.causeSplit / 1000;
        const selectedReward = 20 * env.participantsCount * env.valuePerEntry * env.participantSplit / 1000;
        const ownerReward = 20 * env.participantsCount * env.valuePerEntry * env.ownerSplit / 1000;

        // get state
        const actualState = await fundraiser.state({ from: env.owner });

        // check balances
        const actualCauseReward = await fundraiser.balance({ from: env.cause });
        assert.equal(actualCauseReward, causeReward, "cause reward balance incorrect");
        const actualSelectedReward = await fundraiser.balance({ from: actualState.participant });
        assert.equal(actualSelectedReward, selectedReward, "selected reward balance incorrect");
        const actualOwnerReward = await fundraiser.balance({ from: env.owner });
        assert.equal(actualOwnerReward, ownerReward, "owner reward balance incorrect");

        // issue withdraws
        const causeWithdrawReceipt = await fundraiser.withdraw({ from: env.cause, transact: true });
        const selectedWithdrawReceipt = await fundraiser.withdraw({ from: actualState.participant, transact: true });
        const ownerWithdrawReceipt = await fundraiser.withdraw({ from: env.owner, transact: true });

        // verify owner balance
        const ownerWithdrawGasUsed = ownerWithdrawReceipt.gasUsed;
        const ownerWithdrawTransactionCost = await sh.getTransactionCost(ownerWithdrawGasUsed, state.web3);
        initialBalances[env.owner] = initialBalances[env.owner].minus(ownerWithdrawTransactionCost);
        initialBalances[env.ownerWallet] = initialBalances[env.ownerWallet].plus(ownerReward);

        // verify cause balance
        const causeWithdrawGasUsed = causeWithdrawReceipt.gasUsed;
        const causeWithdrawTransactionCost = await sh.getTransactionCost(causeWithdrawGasUsed, state.web3);
        initialBalances[env.cause] = initialBalances[env.cause].minus(causeWithdrawTransactionCost);
        initialBalances[env.causeWallet] = initialBalances[env.causeWallet].plus(causeReward);

        // verify selected balance
        const selectedWithdrawGasUsed = selectedWithdrawReceipt.gasUsed;
        const selectedWithdrawTransactionCost = await sh.getTransactionCost(selectedWithdrawGasUsed, state.web3);
        const selected = actualState.participant.toLowerCase();
        initialBalances[selected] = initialBalances[selected].minus(selectedWithdrawTransactionCost).plus(selectedReward);

        // verify all balances are expected
        for (let key of state.network.keys) {
            const finalBalance = await sh.getBalance(key.address, state.web3);
            assert.equal(finalBalance.toString(), initialBalances[key.address].toString(), "withdraw balance not expected for " + key.address);
        }

    });

    const testCancelWithdrawFunds = async (account) => {
        
        const initialBalances = {};
        // get all initial balances
        for (let key of state.network.keys) {
            initialBalances[key.address] = await sh.getBalance(key.address, state.web3);
        }

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        // now cancel
        const cancelReceipt = await fundraiser.cancel({ from: account, transact: true });
        const cancelGasUsed = cancelReceipt.gasUsed;
        const cancelTransactionCost = await sh.getTransactionCost(cancelGasUsed, state.web3);
        initialBalances[account] = initialBalances[account].minus(cancelTransactionCost);

        // withdraw all participants
        for (let participant of env.participants) {

            // check pre-balance
            let actualParticipantBalance = await fundraiser.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 20000, "participant pre-balance incorrect");

            // verify pre-participant
            let actualParticipant = await fundraiser.participants({
                address: participant.address
            }, { from: participant.address });
            assert.equal(actualParticipant.entries, 20, "participant pre-entries incorrect");

            // issue withdraw and update local balance
            const withdrawReceipt = await fundraiser.withdraw({ from: participant.address, transact: true });
            const withdrawGasUsed = withdrawReceipt.gasUsed;
            const withdrawTransactionCost = await sh.getTransactionCost(withdrawGasUsed, state.web3);
            initialBalances[participant.address] = initialBalances[participant.address].minus(withdrawTransactionCost).plus(20000); 

            // check post-balance
            actualParticipantBalance = await fundraiser.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 0, "participant pre-balance incorrect");

            // verify pre-participant
            actualParticipant = await fundraiser.participants({
                address: participant.address
            }, { from: participant.address });
            assert.equal(actualParticipant.entries, 0, "participant post-entries incorrect");

        }

        // verify all balances are expected
        for (let key of state.network.keys) {
            const finalBalance = await sh.getBalance(key.address, state.web3);
            assert.equal(finalBalance.toString(), initialBalances[key.address].toString(), "withdraw balance not expected for " + key.address);
        }

    };

    test("should withdraw cancelled (by owner) participation wei", async () => {
        await raise.run(state);
        await testCancelWithdrawFunds(state.env.owner);
    });

    test("should withdraw cancelled (by cause) participation wei", async () => {
        await raise.run(state);
        await testCancelWithdrawFunds(state.env.cause);
    });

    test("should reject multiple withdraw attempts (from participant) after cancel", async () => {
        
        // first raise
        await raise.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        // now cancel
        await fundraiser.cancel({ from: env.owner, transact: true });

        // withdraw a single participant
        const participant = env.participants[0];

        // initial withdraw
        await assert.isFulfilled(
            fundraiser.withdraw({ from: participant.address, transact: true })
        );

        // attempt second withdraw
        await assert.isRejected(
            fundraiser.withdraw({ from: participant.address, transact: true })
        );

    });

    test("should reject multiple withdraw attempts (by cause) after select", async () => {
        
        const { env } = state;

        // set cause lowest so it can
        // have a chance at withdrawing twice
        env.causeSplit = 100
        env.participantSplit = 450;
        env.ownerSplit = 450;
        await end.run(state);
        
        const fundraiser = await state.interfaces.fundraiser;

        await assert.isFulfilled(
            fundraiser.withdraw({ from: env.cause, transact: true })
        );
        await assert.isRejected(
            fundraiser.withdraw({ from: env.cause, transact: true })
        );

    });

    test("should reject multiple withdraw attempts (by selected) after select", async () => {
        
        const { env } = state;

        // set selected lowest so it can
        // have a chance at withdrawing twice
        env.participantSplit = 100;
        env.causeSplit = 100
        env.ownerSplit = 450;
        await end.run(state);
        
        const fundraiser = await state.interfaces.fundraiser;

        // get state
        const actualState = await fundraiser.state({ from: env.owner });

        await assert.isFulfilled(
            fundraiser.withdraw({ from: actualState.participant, transact: true })
        );
        await assert.isRejected(
            fundraiser.withdraw({ from: actualState.participant, transact: true })
        );

    });

    test("should reject multiple withdraw attempts (by owner) after select", async () => {
        
        const { env } = state;

        // set selected lowest so it can
        // have a chance at withdrawing twice
        env.ownerSplit = 100;
        env.participantSplit = 450;
        env.causeSplit = 450;
        await end.run(state);
        
        const fundraiser = await state.interfaces.fundraiser;

        await assert.isFulfilled(
            fundraiser.withdraw({ from: env.owner, transact: true })
        );
        await assert.isRejected(
            fundraiser.withdraw({ from: env.owner, transact: true })
        );

    });

});