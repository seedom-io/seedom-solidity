const sh = require('../script/helper');
const ch = require('../chronicle/helper');
const cli = require('../chronicle/cli');
const deploy = require('../script/simulation/deploy');

suite('deploy', (state) => {

    test("should have proper initial raiser and state", async () => {

        await deploy.run(state);

        const { env } = state;
        const fundraiser = await state.interfaces.fundraiser;
        const now = ch.timestamp();
        const actualDeployment = await fundraiser.deployment({ from: env.owner });
        const deployTimeDifference = actualDeployment.deployTime - now;

        assert.equalIgnoreCase(actualDeployment.owner, env.owner, "owner does not match");
        assert.equalIgnoreCase(actualDeployment.cause, env.cause, "cause does not match");
        assert.equal(actualDeployment.causeSplit, env.causeSplit, "cause split does not match");
        assert.equal(actualDeployment.participantSplit, env.participantSplit, "selected split does not match");
        assert.equal(actualDeployment.ownerSplit, env.ownerSplit, "owner split does not match");
        assert.equal(actualDeployment.ownerSecret, env.ownerSecret, "owner secret does not match");
        assert.equal(actualDeployment.valuePerEntry, env.valuePerEntry, "wei per entry does not match");
        assert.isAtMost(deployTimeDifference, 2, "deploy time delta too high");
        assert.equal(actualDeployment.endTime, env.endTime, "end time does not match");
        assert.equal(actualDeployment.expireTime, env.expireTime, "expire time does not match");
        assert.equal(actualDeployment.destructTime, env.destructTime, "destruct time does not match");

        const actualState = await fundraiser.state({ from: env.owner });

        assert.equal(actualState.causeSecret, 0, "cause secret zero");
        assert.equal(actualState.causeMessage, 0, "cause message zero");
        assert.isNotOk(actualState.causeWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.participant, 0, "selected zero");
        assert.equal(actualState.participantMessage, 0, "selected message zero");
        assert.isNotOk(actualState.participantWithdrawn, 0, "cause not withdrawn");
        assert.equal(actualState.ownerMessage, 0, "owner message zero");
        assert.isNotOk(actualState.ownerWithdrawn, 0, "owner not withdrawn");
        assert.isNotOk(actualState.cancelled, "not cancelled");
        assert.equal(actualState.participants, 0, "total participants zero");
        assert.equal(actualState.entries, 0, "total entries zero");
    });

    test("should deploy properly with no owner split and no max participants", async () => {

        const { env } = state;
        let fundraiser = await state.interfaces.fundraiser;
        
        const cause = state.accountAddresses[1];
        const causeSplit = 500;
        const participantSplit = 500;
        const owner = state.accountAddresses[0];
        const ownerSplit = 0;
        const ownerMessage = sh.messageHex();
        const ownerSecret = sh.hashMessage(ownerMessage, owner);
        const valuePerEntry = 1000;
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;

        fundraiser = await fundraiser.deploy({
            cause,
            causeSplit,
            participantSplit,
            ownerSplit,
            ownerSecret,
            valuePerEntry,
            endTime,
            expireTime,
            destructTime
        }, { from: owner });

        const actualDeployment = await fundraiser.deployment({ from: owner });
        const deployTimeDifference = actualDeployment.deployTime - now;

        assert.equalIgnoreCase(actualDeployment.owner, owner, "owner does not match");
        assert.equalIgnoreCase(actualDeployment.cause, cause, "cause does not match");
        assert.equal(actualDeployment.causeSplit, causeSplit, "cause split does not match");
        assert.equal(actualDeployment.participantSplit, participantSplit, "selected split does not match");
        assert.equal(actualDeployment.ownerSplit, ownerSplit, "owner split does not match");
        assert.equal(actualDeployment.ownerSecret, ownerSecret, "owner secret does not match");
        assert.equal(actualDeployment.valuePerEntry, valuePerEntry, "wei per entry does not match");
        assert.isAtMost(deployTimeDifference, 2, "deploy time delta too high");
        assert.equal(actualDeployment.endTime, endTime, "end time does not match");
        assert.equal(actualDeployment.expireTime, expireTime, "expire time does not match");
        assert.equal(actualDeployment.destructTime, destructTime, "destruct time does not match");

    });

    test("should fail to deploy with zeroed data", async () => {

        const cause = state.accountAddresses[1];
        const causeSplit = 600;
        const participantSplit = 350;
        const owner = state.accountAddresses[0];
        const ownerSplit = 50;
        const ownerMessage = sh.messageHex();
        const ownerSecret = sh.hashMessage(ownerMessage, owner);
        const valuePerEntry = 1000;
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        
        const testData = [
            {cause: 0, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime},
            {cause, causeSplit: 0, participantSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime},
            {cause, causeSplit, participantSplit: 0, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime},
            {cause, causeSplit, participantSplit, ownerSplit: 0, ownerSecret, valuePerEntry, endTime, expireTime, destructTime},
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret: 0, valuePerEntry, endTime, expireTime, destructTime},
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry: 0, endTime, expireTime, destructTime},
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry, endTime: 0, expireTime, expireTime, destructTime},
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime: 0, destructTime},
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry, endTime, expireTime, destructTime: 0}
        ];
        
        for (let testArgs of testData) {
            cli.json(testArgs);
            assert.equal(Object.keys(testArgs).length, 9, "invalid number of test args");
            await assert.isRejected(
                (await state.interfaces.fundraiser).deploy(testArgs, { from: owner })
            );
        }

    });

    test("should fail to deploy with splits that don't add to 1000", async () => {

        const cause = state.accountAddresses[1];
        const owner = state.accountAddresses[0];
        const ownerMessage = sh.messageHex();
        const ownerSecret = sh.hashMessage(ownerMessage, owner);
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const valuePerEntry = 1000;
        
        const testData = [
            {cause, causeSplit: 20, participantSplit: 30, ownerSplit: 50, ownerSecret, valuePerEntry, endTime, expireTime, destructTime},
            {cause, causeSplit: 200, participantSplit: 350, ownerSplit: 500, ownerSecret, valuePerEntry, endTime, expireTime, destructTime},
            {cause, causeSplit: 601, participantSplit: 200, ownerSplit: 200, ownerSecret, valuePerEntry, endTime, expireTime, destructTime},
            {cause, causeSplit: 6000, participantSplit: 2000, ownerSplit: 2000, ownerSecret, valuePerEntry, endTime, expireTime, destructTime}
        ];
        
        for (let testArgs of testData) {
            cli.json(testArgs);
            assert.equal(Object.keys(testArgs).length, 9, "invalid number of test args");
            await assert.isRejected(
                (await state.interfaces.fundraiser).deploy(testArgs, { from: owner })
            );
        }

    });

    test("should fail to deploy with invalid dates", async () => {

        const cause = state.accountAddresses[1];
        const causeSplit = 600;
        const participantSplit = 350;
        const ownerSplit = 50;
        const valuePerEntry = 1000;
        const owner = state.accountAddresses[0];
        const ownerMessage = sh.messageHex();
        const ownerSecret = sh.hashMessage(ownerMessage, owner);
        const phaseDuration = 5000;
        const now = ch.timestamp();
        const endTime = now + phaseDuration;
        const expireTime = endTime + phaseDuration;
        const destructTime = expireTime + phaseDuration;
        const oldEndTime = now - phaseDuration * 3;
        const oldExpireTime = oldEndTime + phaseDuration;
        const oldDestructTime = oldExpireTime + phaseDuration;
        

        const testData = [
            // old dates
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime: oldEndTime,
                expireTime,
                destructTime},
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime: oldExpireTime,
                destructTime},
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime,
                destructTime: oldDestructTime},
            // equal dates
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime: endTime,
                destructTime},
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime,
                destructTime: expireTime},
            // out of order dates
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime: expireTime,
                expireTime: endTime,
                destructTime},
            {cause, causeSplit, participantSplit, ownerSplit, ownerSecret, valuePerEntry,
                endTime,
                expireTime: destructTime,
                destructTime: expireTime}
        ];

        for (let testArgs of testData) {
            cli.json(testArgs);
            assert.equal(Object.keys(testArgs).length, 9, "invalid number of test args");
            await assert.isRejected(
                (await state.interfaces.fundraiser).deploy(testArgs, { from: owner })
            );
        }

    });

});
