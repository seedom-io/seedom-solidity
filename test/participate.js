const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const begin = require('../script/simulation/begin');
const deploy = require('../script/simulation/deploy');
const participate = require('../script/simulation/participate');
const m = require('../../seedom-crypter/messages');

suite('participate', (state) => {

    test("should accept participants after begin", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        await participate.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await fundraiser.participants({
                address: participant.address
            }, { from: participant.address });

            assert.equal(actualParticipant.entries, 10, "entries should be 10");
            assert.equalIgnoreCase(actualParticipant.message, participant.message, "message should match");

            const participateTransactionCost = await sh.getTransactionCost(participant.participateReceipt.gasUsed, state.web3);
            const participationBalance = initialBalances[participant.address].minus(participateTransactionCost).minus(10000);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

            // check balance()s
            const actualParticipantBalance = await fundraiser.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 0, "participant balance not zero");

        }

        const actualState = await fundraiser.state({ from: env.owner });

        assert.equal(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equal(actualState.causeMessage, 0, "cause message zero");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.entries, env.participantsCount * 10, "total entries incorrect");

    });

    test("should accept and refund participants after begin", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        const { env } = state;

        // raise at refund generating amount
        env.participateRaise = 10500;
        await participate.run(state);

        const fundraiser = await state.interfaces.fundraiser;

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await fundraiser.participants({
                address: participant.address
            }, { from: participant.address });

            assert.equal(actualParticipant.entries, 10, "entries should be correct");
            assert.equalIgnoreCase(actualParticipant.message, participant.message, "message should match");

            const participateTransactionCost = await sh.getTransactionCost(participant.participateReceipt.gasUsed, state.web3);
            // participant should be refunded 500 (partial entry) in transaction for a net loss of 10000
            const participationBalance = initialBalances[participant.address].minus(participateTransactionCost).minus(10000);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

        }

        const actualState = await fundraiser.state({ from: env.owner });

        assert.equal(actualState.causeSecret, env.causeSecret, "cause secret does not match");
        assert.equal(actualState.causeMessage, 0, "cause message zero");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.entries, env.participantsCount * 10, "total entries incorrect");

    });

    test("should fail participation without begin", async () => {

        await deploy.run(state);

        const { env } = state;
        const participant = state.accountAddresses[4];
        const message = m.random();

        await assert.isRejected(
            (await state.interfaces.fundraiser).participate({
                message
            }, { from: participant, transact: true })
        );

    });

    test("should reject participation after select", async () => {

        await begin.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now, 1);

        const participant = state.accountAddresses[4];
        const message = m.random();

        await assert.isRejected(
            (await state.interfaces.fundraiser).participate({
                message
            }, { from: participant, transact: true })
        );

    });

    test("should fail owner participation after begin", async () => {

        await begin.run(state);
        
        const { env } = state;
        const message = m.random();

        await assert.isRejected(
            (await state.interfaces.fundraiser).participate({
                message
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject multiple participation from same address after begin", async () => {

        await begin.run(state);
        
        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;
        const participant = state.accountAddresses[4];
        let message = m.random();

        await assert.isFulfilled(
            fundraiser.participate({
                message
            }, { from: participant, value: 10000, transact: true })
        );

        await assert.isRejected(
            fundraiser.participate({
                message
            }, { from: participant, value: 10000, transact: true })
        );

        // generate a new message just for fun
        message = m.random();

        await assert.isRejected(
            fundraiser.participate({
                message
            }, { from: participant, value: 10000, transact: true })
        );

    });

    test("reject participation of zeroed message after begin", async () => {

        await begin.run(state);
        
        const { env } = state;
        const participant = state.accountAddresses[4];
        const message = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        await assert.isRejected(
            (await state.interfaces.fundraiser).participate({
                message
            }, { from: participant, transact: true })
        );

    });

});
