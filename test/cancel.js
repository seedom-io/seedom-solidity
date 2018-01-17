const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const kickoff = require('../stage/kickoff');
const seed = require('../stage/seed');
const participate = require('../stage/participate');
const raise = require('../stage/raise');
const reveal = require('../stage/reveal');
const end = require('../stage/end');

suite('cancel', (state) => {

    const testCancelRejectedWithoutKickoff = async (account) => {

        const stage = state.stage;
        
        // cancel should still be true initially
        let actualState = await stage.instances.seedom.methods.state().call({ from: account });
        assert.isOk(actualState._cancelled);

        const method = stage.instances.seedom.methods.cancel();
        await assert.isRejected(
            parity.sendMethod(method, { from: account }),
            parity.SomethingThrown
        );

        actualState = await stage.instances.seedom.methods.state().call({ from: account });
        assert.isOk(actualState._cancelled);

    };

    test("should reject cancel (by owner) before kickoff", async () => {
        
        // first instantiate
        await instantiate.stage(state);

        const stage = state.stage;
        // cancel should still be true initially
        const actualState = await stage.instances.seedom.methods.state().call({ from: stage.owner });
        assert.isOk(actualState._cancelled);

        await testCancelRejectedWithoutKickoff(stage.owner);

    });

    test("should reject cancel (by charity) before kickoff", async () => {
        
        // first instantiate
        await instantiate.stage(state);

        const stage = state.stage;
        const charity = state.accountAddresses[1];
        // cancel should still be true initially
        const actualState = await stage.instances.seedom.methods.state().call({ from: stage.owner });
        assert.isOk(actualState._cancelled);

        await testCancelRejectedWithoutKickoff(charity);

    });

    test("should reject cancel (by participant) before kickoff", async () => {
        
        // first instantiate
        await instantiate.stage(state);

        const stage = state.stage;
        const participant = state.accountAddresses[2];
        // cancel should still be true initially
        const actualState = await stage.instances.seedom.methods.state().call({ from: stage.owner });
        assert.isOk(actualState._cancelled);

        await testCancelRejectedWithoutKickoff(participant);

    });

    const testCancelAfterKickoff = async (account) => {
        
        const stage = state.stage;
        // after kickoff, cancel should never be true
        let actualState = await stage.instances.seedom.methods.state().call({ from: account });
        assert.isNotOk(actualState._cancelled);

        const method = stage.instances.seedom.methods.cancel();
        await assert.isFulfilled(
            parity.sendMethod(method, { from: account })
        );

        actualState = await stage.instances.seedom.methods.state().call({ from: account });
        assert.isOk(actualState._cancelled);

    };

    test("should cancel (by owner) after kickoff", async () => {

        // first kickoff
        await kickoff.stage(state);
        const stage = state.stage;
        await testCancelAfterKickoff(stage.owner);

    });

    test("should cancel (by charity) after kickoff", async () => {

        // first kickoff
        await kickoff.stage(state);
        const stage = state.stage;
        await testCancelAfterKickoff(stage.charity);

    });

    const testCancelRejectedAfterKickoff = async (account) => {
        
        const stage = state.stage;
        // after kickoff, cancel should never be true
        let actualState = await stage.instances.seedom.methods.state().call({ from: account });
        assert.isNotOk(actualState._cancelled);

        const method = stage.instances.seedom.methods.cancel();
        await assert.isRejected(
            parity.sendMethod(method, { from: account }),
            parity.SomethingThrown
        );

        actualState = await stage.instances.seedom.methods.state().call({ from: account });
        assert.isNotOk(actualState._cancelled);

    };

    test("should reject cancel (by participant) after kickoff", async () => {

        // first kickoff
        await kickoff.stage(state);
        const participant = state.accountAddresses[2];
        await testCancelRejectedAfterKickoff(participant);

    });

    test("should cancel (by owner) after seed", async () => {

        // first seed
        await seed.stage(state);
        const stage = state.stage;
        await testCancelAfterKickoff(stage.owner);

    });

    test("should cancel (by charity) after seed", async () => {
        
        // first seed
        await seed.stage(state);
        const stage = state.stage;
        await testCancelAfterKickoff(stage.charity);

    });

    test("should reject cancel (by participant) after seed", async () => {
        
        // first kickoff
        await seed.stage(state);
        const participant = state.accountAddresses[2];
        await testCancelRejectedAfterKickoff(participant);

    });

    const testCancelRefundsAfterRaising = async (account) => {

        const stage = state.stage;
        // make sure we aren't already cancelled
        let actualState = await stage.instances.seedom.methods.state().call({ from: account });
        assert.isNotOk(actualState._cancelled);

        const method = stage.instances.seedom.methods.cancel();
        await assert.isFulfilled(
            parity.sendMethod(method, { from: account })
        );

        // verify all participants refunded
        for (let participant of stage.participants) {
            const actualBalance = await stage.instances.seedom.methods.balancesMapping(participant.address).call({ from: participant.address });
            assert.equal(actualBalance, 10000, "refund balance should be correct");
        }

        actualState = await stage.instances.seedom.methods.state().call({ from: account });
        assert.isOk(actualState._cancelled);

    };

    test("should cancel (by owner) and refund after raising", async () => {

        // first raise
        await raise.stage(state);
        const stage = state.stage;
        await testCancelRefundsAfterRaising(stage.owner);

    });

    test("should cancel (by charity) and refund after raising", async () => {
        
        // first raise
        await raise.stage(state);
        const stage = state.stage;
        await testCancelRefundsAfterRaising(stage.charity);

    });

    test("should cancel (by owner) and refund after revelation", async () => {

        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelRefundsAfterRaising(stage.owner);

    });

    test("should cancel (by charity) and refund after revelation", async () => {
        
        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelRefundsAfterRaising(stage.charity);

    });

    test("should reject cancel (from owner) after end", async () => {

        // first end
        await end.stage(state);
        const stage = state.stage;
        await testCancelRejectedAfterKickoff(stage.owner);

    });

    test("should reject cancel (from charity) after end", async () => {
        
        // first end
        await end.stage(state);
        const stage = state.stage;
        await testCancelRejectedAfterKickoff(stage.charity);

    });

    test("should reject cancel (from participant) after end", async () => {
        
        // first end
        await end.stage(state);
        const participant = state.accountAddresses[2];
        await testCancelRejectedAfterKickoff(participant);

    });

    const testCancelRefundsAfterExpiration = async (account) => {

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.seedom);
        const expireTime = stage.expireTime;
        await cli.progress("waiting for expiration time", expireTime - now);

        await testCancelRefundsAfterRaising(account);

    };

    test("should cancel (from participant) after expiration", async () => {
        
        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelRefundsAfterExpiration(stage.participants[0].address);

    });

    test("should cancel (by owner) and refund after expiration", async () => {
        
        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelRefundsAfterExpiration(stage.owner);

    });

    test("should cancel (by charity) and refund after expiration", async () => {
        
        // first reveal
        await reveal.stage(state);
        const stage = state.stage;
        await testCancelRefundsAfterExpiration(stage.charity);

    });

});
