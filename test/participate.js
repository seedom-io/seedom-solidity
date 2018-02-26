const ch = require('../chronicle/helper');
const sh = require('../script/helper');
const cli = require('../chronicle/cli');
const seed = require('../script/simulation/seed');
const deploy = require('../script/simulation/deploy');
const participate = require('../script/simulation/participate');

suite('participate', (state) => {

    test("should accept participants after seed", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        await participate.run(state);

        const { env } = state;
        const seedom = await state.interfaces.seedom;

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await seedom.participants({
                address: participant.address
            }, { from: participant.address });

            assert.equal(actualParticipant.entries, 10, "entries should be 10");
            assert.equalIgnoreCase(actualParticipant.message, participant.message, "message should match");

            const participateTransactionCost = await sh.getTransactionCost(participant.participateReceipt.gasUsed, state.web3);
            const participationBalance = initialBalances[participant.address].minus(participateTransactionCost).minus(10000);
            const finalBalance = await sh.getBalance(participant.address, state.web3);
            assert.equal(finalBalance.toString(), participationBalance.toString(), "balance not expected for " + participant.address);

            // check balance()s
            const actualParticipantBalance = await seedom.balance({ from: participant.address });
            assert.equal(actualParticipantBalance, 0, "participant balance not zero");

        }

        const actualState = await seedom.state({ from: env.owner });

        assert.equal(actualState.charitySecret, env.charitySecret, "charity secret does not match");
        assert.equal(actualState.charityMessage, 0, "charity message zero");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.winner, 0, "winner zero");
        assert.equal(actualState.winnerMessage, 0, "winner message zero");
        assert.isNotOk(actualState.winnerWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalEntries, env.participantsCount * 10, "total entries incorrect");

    });

    test("should accept and refund participants after seed", async () => {

        const initialBalances = {};
        // get all initial balances
        for (let accountAddress of state.accountAddresses) {
            initialBalances[accountAddress] = await sh.getBalance(accountAddress, state.web3);
        }

        const { env } = state;

        // raise at refund generating amount
        env.participateRaise = 10500;
        await participate.run(state);

        const seedom = await state.interfaces.seedom;

        // validate every participant
        for (let participant of env.participants) {

            const actualParticipant = await seedom.participants({
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

        const actualState = await seedom.state({ from: env.owner });

        assert.equal(actualState.charitySecret, env.charitySecret, "charity secret does not match");
        assert.equal(actualState.charityMessage, 0, "charity message zero");
        assert.isNotOk(actualState.charityWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.winner, 0, "winner zero");
        assert.equal(actualState.winnerMessage, 0, "winner message zero");
        assert.isNotOk(actualState.winnerWithdrawn, 0, "charity not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.totalParticipants, env.participantsCount, "total participants incorrect");
        assert.equal(actualState.totalEntries, env.participantsCount * 10, "total entries incorrect");

    });

    test("reject participation if over max participants", async () => {

        await participate.run(state);
        
        const { env } = state;
        // get last participant that is never used otherwise
        const participant = state.accountAddresses[8];
        const message = sh.messageHex();
        
        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                message
            }, { from: participant, transact: true })
        );

    });

    test("should fail participation without seed", async () => {

        await deploy.run(state);

        const { env } = state;
        const participant = state.accountAddresses[2];
        const message = sh.messageHex();

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                message
            }, { from: participant, transact: true })
        );

    });

    test("should reject participation after end", async () => {

        await seed.run(state);

        const { env } = state;
        const now = ch.timestamp();
        await cli.progress("waiting for end phase", env.endTime - now);

        const participant = state.accountAddresses[2];
        const message = sh.messageHex();

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                message
            }, { from: participant, transact: true })
        );

    });

    test("should fail owner participation after seed", async () => {

        await seed.run(state);
        
        const { env } = state;
        const message = sh.messageHex();

        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                message
            }, { from: env.owner, transact: true })
        );

    });

    test("should reject multiple participation from same address after seed", async () => {

        await seed.run(state);
        
        const { env } = state;
        const seedom = await state.interfaces.seedom;
        const participant = state.accountAddresses[2];
        let message = sh.messageHex();

        await assert.isFulfilled(
            seedom.participate({
                message
            }, { from: participant, value: 10000, transact: true })
        );

        await assert.isRejected(
            seedom.participate({
                message
            }, { from: participant, value: 10000, transact: true })
        );

        // generate a new message just for fun
        message = sh.messageHex();

        await assert.isRejected(
            seedom.participate({
                message
            }, { from: participant, value: 10000, transact: true })
        );

    });

    test("reject participation of zeroed message after seed", async () => {

        await seed.run(state);
        
        const { env } = state;
        const participant = state.accountAddresses[2];
        const message = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        await assert.isRejected(
            (await state.interfaces.seedom).participate({
                message
            }, { from: participant, transact: true })
        );

    });

});
