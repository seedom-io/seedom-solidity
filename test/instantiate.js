const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
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

        const result = await networks.deploy('seedom', [
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

        const actualRaiser = await result.instance.methods.raiser().call({ from: owner });
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

        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const charitySplit = 600;
        const winnerSplit = 350;
        const ownerSplit = 50;
        const valuePerEntry = 1000;
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const maxParticipants = 5;
        
        const testData = [
            [0, charitySplit, winnerSplit, ownerSplit, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants],
            [charity, 0, winnerSplit, ownerSplit, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants],
            [charity, charitySplit, 0, ownerSplit, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants],
            [charity, charitySplit, winnerSplit, 0, valuePerEntry, revealTime, endTime, expireTime, destructTime, maxParticipants],
            [charity, charitySplit, winnerSplit, ownerSplit, 0, revealTime, endTime, expireTime, destructTime, maxParticipants],
            [charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, 0, endTime, expireTime, destructTime, maxParticipants],
            [charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, revealTime, 0, expireTime, destructTime, maxParticipants],
            [charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, revealTime, endTime, 0, destructTime, maxParticipants],
            [charity, charitySplit, winnerSplit, ownerSplit, valuePerEntry, revealTime, endTime, expireTime, 0, maxParticipants]
        ];
        
        for (let testArgs of testData) {
            cli.info(testArgs);
            await assert.isRejected(
                networks.deploy('seedom', testArgs, { from: owner }, state)
            );
        }

    });

    test("should fail to instantiate with splits that don't add to 1000", async () => {

        const now = ch.timestamp();
        const owner = state.accountAddresses[0];
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const maxParticipants = 5;
        
        const testData = [
            [charity, 20, 30, 50, 1000, revealTime, endTime, expireTime, destructTime, maxParticipants],
            [charity, 200, 350, 500, 1000, revealTime, endTime, expireTime, destructTime, maxParticipants],
            [charity, 601, 200, 200, 1000, revealTime, endTime, expireTime, destructTime, maxParticipants],
            [charity, 6000, 2000, 2000, 1000, revealTime, endTime, expireTime, destructTime, maxParticipants]
        ];
        
        for (let testArgs of testData) {
            cli.info(testArgs);
            await assert.isRejected(
                networks.deploy('seedom', testArgs, { from: owner }, state)
            );
        }

    });

    test("should fail to instantiate with invalid dates", async () => {

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
        const maxParticipants = 5;

        const testData = [
            // old dates
            [charity, 600, 350, 50, 1000, oldRevealTime, endTime, expireTime, destructTime, maxParticipants],
            [charity, 600, 350, 50, 1000, revealTime, oldEndTime, expireTime, destructTime, maxParticipants],
            [charity, 600, 350, 50, 1000, revealTime, endTime, oldExpireTime, destructTime, maxParticipants],
            [charity, 600, 350, 50, 1000, revealTime, endTime, expireTime, oldDestructTime, maxParticipants],
            // equal dates
            [charity, 600, 350, 50, 1000, revealTime, revealTime, expireTime, destructTime, maxParticipants],
            [charity, 600, 350, 50, 1000, revealTime, endTime, endTime, destructTime, maxParticipants],
            [charity, 600, 350, 50, 1000, revealTime, endTime, expireTime, expireTime, maxParticipants],
            // out of order dates
            [charity, 600, 350, 50, 1000, endTime, revealTime, expireTime, destructTime, maxParticipants],
            [charity, 600, 350, 50, 1000, revealTime, expireTime, endTime, destructTime, maxParticipants],
            [charity, 600, 350, 50, 1000, revealTime, endTime, destructTime, expireTime, maxParticipants]
        ];

        for (let testArgs of testData) {
            cli.info(testArgs);
            await assert.isRejected(
                networks.deploy('seedom', testArgs, { from: owner }, state)
            );
        }

    });

});
