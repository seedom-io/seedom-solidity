const ch = require('../chronicle/helper');
const sh = require('../stage/helper');
const cli = require('../chronicle/cli');
const parity = require('../chronicle/parity');
const instantiate = require('../stage/instantiate');
const kickoff = require('../stage/kickoff');

suite('kickoff', (state) => {

    test("should kickoff properly", async () => {

        await kickoff.stage(state);

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.seedom);
        const actualRaiser = await stage.instances.seedom.methods.raiser().call({ from: stage.owner });
        const actualKickoffTimeDifference = actualRaiser._kickoffTime - now;

        assert.equalIgnoreCase(actualRaiser._charity, stage.charity, "charity does not match");
        assert.equal(actualRaiser._charitySplit, stage.charitySplit, "charity split does not match");
        assert.equal(actualRaiser._winnerSplit, stage.winnerSplit, "winner split does not match");
        assert.equal(actualRaiser._ownerSplit, stage.ownerSplit, "validOwner split does not match");
        assert.equal(actualRaiser._valuePerEntry, stage.valuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualKickoffTimeDifference, 2, "kick time delta too high");
        assert.equal(actualRaiser._revealTime, stage.revealTime, "reveal time does not match");
        assert.equal(actualRaiser._endTime, stage.endTime, "end time does not match");
        assert.equal(actualRaiser._expireTime, stage.expireTime, "expire time does not match");
        assert.equal(actualRaiser._maxParticipants, stage.maxParticipants, "max participants does not match");

    });

    test("should kickoff properly with no owner split and no max participants", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.seedom);
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const valuePerEntry = 1000;
        const charitySplit = 500;
        const winnerSplit = 500;
        const ownerSplit = 0;
        const maxParticipants = 0;

        const method = stage.instances.seedom.methods.kickoff(
            charity,
            charitySplit,
            winnerSplit,
            ownerSplit,
            valuePerEntry,
            revealTime,
            endTime,
            expireTime,
            maxParticipants
        );
    
        await parity.sendMethod(method, { from: stage.owner });

        const actualRaiser = await stage.instances.seedom.methods.raiser().call({ from: stage.owner });
        const actualKickoffTimeDifference = actualRaiser._kickoffTime - now;

        assert.equalIgnoreCase(actualRaiser._charity, charity, "charity does not match");
        assert.equal(actualRaiser._charitySplit, charitySplit, "charity split does not match");
        assert.equal(actualRaiser._winnerSplit, winnerSplit, "winner split does not match");
        assert.equal(actualRaiser._ownerSplit, ownerSplit, "validOwner split does not match");
        assert.equal(actualRaiser._valuePerEntry, valuePerEntry, "wei per entry does not match");
        assert.isAtMost(actualKickoffTimeDifference, 2, "kick time delta too high");
        assert.equal(actualRaiser._revealTime, revealTime, "reveal time does not match");
        assert.equal(actualRaiser._endTime, endTime, "end time does not match");
        assert.equal(actualRaiser._expireTime, expireTime, "expire time does not match");
        assert.equal(actualRaiser._maxParticipants, maxParticipants, "max participants does not match");

    });

    test("should fail to kickoff with zeroed data", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.seedom);
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        
        const testData = [
            [0, 600, 350, 50, 1000, revealTime, endTime, expireTime, 5],
            [charity, 0, 350, 50, 1000, revealTime, endTime, expireTime, 5],
            [charity, 600, 0, 50, 1000, revealTime, endTime, expireTime, 5],
            [charity, 600, 350, 50, 0, revealTime, endTime, expireTime, 5],
            [charity, 600, 350, 50, 1000, 0, endTime, expireTime, 5],
            [charity, 600, 350, 50, 1000, revealTime, 0, expireTime, 5],
            [charity, 600, 350, 50, 1000, revealTime, endTime, 0, 5]
        ];
        
        for (let testArgs of testData) {
            cli.info(testArgs);
            const method = stage.instances.seedom.methods.kickoff.apply(null, testArgs);
            await assert.isRejected(
                parity.sendMethod(method, { from: stage.owner }),
                parity.SomethingThrown,
                null,
                testArgs
            );
        }

    });

    test("should fail to kickoff with splits that don't add to 1000", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.seedom);
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        
        const testData = [
            [charity, 20, 30, 50, 1000, revealTime, endTime, expireTime, 5],
            [charity, 200, 350, 500, 1000, revealTime, endTime, expireTime, 5],
            [charity, 601, 200, 200, 1000, revealTime, endTime, expireTime, 5],
            [charity, 6000, 2000, 2000, 1000, revealTime, endTime, expireTime, 5]
        ];
        
        for (let testArgs of testData) {
            cli.info(testArgs);
            const method = stage.instances.seedom.methods.kickoff.apply(null, testArgs);
            await assert.isRejected(
                parity.sendMethod(method, { from: stage.owner }),
                parity.SomethingThrown,
                null,
                testArgs
            );
        }

    });

    test("should fail to kickoff with invalid dates", async () => {

        await instantiate.stage(state);

        const stage = state.stage;
        const now = await sh.timestamp(stage.instances.seedom);
        const charity = state.accountAddresses[1];
        const phaseDuration = 5000;
        const revealTime = now + phaseDuration;
        const endTime = revealTime + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const oldRevealTime = now - phaseDuration * 3;
        const oldEndTime = oldRevealTime + phaseDuration;
        const oldExpireTime = oldEndTime + phaseDuration;

        const testData = [
            // old dates
            [charity, 600, 350, 50, 1000, oldRevealTime, endTime, expireTime, 5],
            [charity, 600, 350, 50, 1000, revealTime, oldEndTime, expireTime, 5],
            [charity, 600, 350, 50, 1000, revealTime, endTime, oldExpireTime, 5],
            // equal dates
            [charity, 600, 350, 50, 1000, revealTime, revealTime, expireTime, 5],
            [charity, 600, 350, 50, 1000, revealTime, endTime, endTime, 5],
            [charity, 600, 350, 50, 1000, revealTime, endTime, revealTime, 5],
            // out of order dates
            [charity, 600, 350, 50, 1000, endTime, revealTime, expireTime, 5],
            [charity, 600, 350, 50, 1000, revealTime, expireTime, endTime, 5],
            [charity, 600, 350, 50, 1000, endTime, expireTime, revealTime, 5]
        ];

        for (let testArgs of testData) {
            cli.info(testArgs);
            const method = stage.instances.seedom.methods.kickoff.apply(null, testArgs);
            await assert.isRejected(
                parity.sendMethod(method, { from: stage.owner }),
                parity.SomethingThrown,
                null,
                testArgs
            );
        }

    });

});