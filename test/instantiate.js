const instantiate = require('../stage/instantiate');
const networks = require('../chronicle/networks');

suite('instantiate', (state) => {

    test("should have proper initial raiser and state", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = ch.timestamp();
        const actualRaiser = await stage.seedom.methods.raiser().call({ from: stage.owner });
        const actualInstantiateTimeDifference = actualRaiser._instantiateTime - now;

        assert.equalIgnoreCase(actualRaiser._owner, stage.owner, "owner does not match");
        assert.equalIgnoreCase(actualRaiser._charity, stage.charity, "charity does not match");
        assert.equal(actualRaiser._charitySplit, stage.charitySplit, "charity split does not match");
        assert.equal(actualRaiser._winnerSplit, stage.winnerSplit, "winner split does not match");
        assert.equal(actualRaiser._ownerSplit, stage.ownerSplit, "validOwner split does not match");
        assert.equal(actualRaiser._valuePerEntry, stage.valuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualInstantiateTimeDifference, 2, "instantiate time delta too high");
        assert.equal(actualRaiser._revealTime, stage.revealTime, "reveal time does not match");
        assert.equal(actualRaiser._endTime, stage.endTime, "end time does not match");
        assert.equal(actualRaiser._expireTime, stage.expireTime, "expire time does not match");
        assert.equal(actualRaiser._destructTime, stage.destructTime, "destruct time does not match");
        assert.equal(actualRaiser._maxParticipants, stage.maxParticipants, "max participants does not match");

        const actualState = await stage.seedom.methods.state().call({ from: stage.owner });

        assert.equal(actualState._charityHashedRandom, 0, "charity hashed random zero");
        assert.equal(actualState._winner, 0, "winner zero");
        assert.equal(actualState._winnerRandom, 0, "winner random zero");
        assert.isNotOk(actualState._cancelled, "initially cancelled");
        assert.equal(actualState._totalParticipants, 0, "total participants zero");
        assert.equal(actualState._totalEntries, 0, "total entries zero");
        assert.equal(actualState._totalRevealers, 0, "total revealers zero");
        assert.equal(actualState._totalRevealed, 0, "total revealed zero");
    });

    test("should instantiate properly with no owner split and no max participants", async () => {

        const stage = state.stage;
        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const valuePerEntry = 1000;
        const charitySplit = 500;
        const winnerSplit = 500;
        const ownerSplit = 0;
        const maxParticipants = 0;

        await networks.deploy('seedom', [
            charity,
            charitySplit,
            winnerSplit,
            ownerSplit,
            valuePerEntry,
            revealTime,
            endTime,
            expireTime,
            destructTime,
            maxParticipants
        ], { from: owner }, state);

        const actualRaiser = await stage.seedom.methods.raiser().call({ from: stage.owner });
        const actualInstantiateTimeDifference = actualRaiser._instantiateTime - now;

        assert.equalIgnoreCase(actualRaiser._owner, owner, "owner does not match");
        assert.equalIgnoreCase(actualRaiser._charity, charity, "charity does not match");
        assert.equal(actualRaiser._charitySplit, charitySplit, "charity split does not match");
        assert.equal(actualRaiser._winnerSplit, winnerSplit, "winner split does not match");
        assert.equal(actualRaiser._ownerSplit, ownerSplit, "validOwner split does not match");
        assert.equal(actualRaiser._valuePerEntry, valuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualInstantiateTimeDifference, 2, "instantiate time delta too high");
        assert.equal(actualRaiser._revealTime, revealTime, "reveal time does not match");
        assert.equal(actualRaiser._endTime, endTime, "end time does not match");
        assert.equal(actualRaiser._expireTime, expireTime, "expire time does not match");
        assert.equal(actualRaiser._destructTime, destructTime, "destruct time does not match");
        assert.equal(actualRaiser._maxParticipants, maxParticipants, "max participants does not match");

    });

    test("should fail to instantiate with zeroed data", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        
        const testData = [
            [0, charity, 600, 350, 50, 1000, revealTime, endTime, expireTime, destructTime, 5],
            [owner, 0, 600, 350, 50, 1000, revealTime, endTime, expireTime, destructTime, 5],
            [owner, charity, 0, 350, 50, 1000, revealTime, endTime, expireTime, destructTime, 5],
            [owner, charity, 600, 0, 50, 1000, revealTime, endTime, expireTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 0, revealTime, endTime, expireTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, 0, endTime, expireTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, revealTime, 0, expireTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, revealTime, endTime, 0, destructTime, 5]
            [owner, charity, 600, 350, 50, 1000, revealTime, endTime, expireTime, 0, 5]
        ];
        
        for (let testArgs of testData) {
            cli.info(testArgs);
            await assert.isRejected(
                networks.deploy('seedom', testData, { from: stage.owner }, state),
                parity.SomethingThrown,
                null,
                testArgs
            );
        }

    });

    test("should fail to instantiate with splits that don't add to 1000", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        
        const testData = [
            [owner, charity, 20, 30, 50, 1000, revealTime, endTime, expireTime, destructTime, 5],
            [owner, charity, 200, 350, 500, 1000, revealTime, endTime, expireTime, destructTime, 5],
            [owner, charity, 601, 200, 200, 1000, revealTime, endTime, expireTime, destructTime, 5],
            [owner, charity, 6000, 2000, 2000, 1000, revealTime, endTime, expireTime, destructTime, 5]
        ];
        
        for (let testArgs of testData) {
            cli.info(testArgs);
            await assert.isRejected(
                networks.deploy('seedom', testData, { from: stage.owner }, state),
                parity.SomethingThrown,
                null,
                testArgs
            );
        }

    });

    test("should fail to instantiate with invalid dates", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const oldRevealTime = now - phaseDuration * 4;
        const oldEndTime = oldRevealTime + phaseDuration;
        const oldExpireTime = oldEndTime + phaseDuration;
        const oldDestructTime = oldExpireTime + phaseDuration;

        const testData = [
            // old dates
            [owner, charity, 600, 350, 50, 1000, oldRevealTime, endTime, expireTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, revealTime, oldEndTime, expireTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, revealTime, endTime, oldExpireTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, revealTime, endTime, expireTime, oldDestructTime, 5],
            // equal dates
            [owner, charity, 600, 350, 50, 1000, revealTime, revealTime, expireTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, revealTime, endTime, endTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, revealTime, endTime, expireTime, expireTime, 5],
            // out of order dates
            [owner, charity, 600, 350, 50, 1000, endTime, revealTime, expireTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, revealTime, expireTime, endTime, destructTime, 5],
            [owner, charity, 600, 350, 50, 1000, revealTime, endTime, destructTime, expireTime, 5]
        ];

        for (let testArgs of testData) {
            cli.info(testArgs);
            await assert.isRejected(
                networks.deploy('seedom', testData, { from: stage.owner }, state),
                parity.SomethingThrown,
                null,
                testArgs
            );
        }

    });

});
