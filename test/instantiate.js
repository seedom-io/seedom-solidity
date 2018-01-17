const instantiate = require('../stage/instantiate');

suite('instantiate', (state) => {

    test("should set the owner to us", async () => {
        await instantiate.stage(state);
        const stage = state.stage;
        const actualOwner = await stage.instances.seedom.methods.owner().call({from: stage.owner});
        assert.equalIgnoreCase(actualOwner, stage.owner, "owner wasn't us");
    });

    test("should have proper initial raiser and state", async () => {

        await instantiate.stage(state);

        const stage = state.stage;

        const actualRaiser = await stage.instances.seedom.methods.raiser().call({ from: stage.owner });

        assert.equal(actualRaiser._charity, 0, "charity zero");
        assert.equal(actualRaiser._charitySplit, 0, "charity split zero");
        assert.equal(actualRaiser._winnerSplit, 0, "winner split zero");
        assert.equal(actualRaiser._ownerSplit, 0, "owner split zero");
        assert.equal(actualRaiser._valuePerEntry, 0, "value per entry zero");
        assert.equal(actualRaiser._kickoffTime, 0, "kickoff time zero");
        assert.equal(actualRaiser._revealTime, 0, "reveal time zero");
        assert.equal(actualRaiser._endTime, 0, "end time zero");
        assert.equal(actualRaiser._expireTime, 0, "expire time zero");
        assert.equal(actualRaiser._maxParticipants, 0, "max participants zero");

        const actualState = await stage.instances.seedom.methods.state().call({ from: stage.owner });

        assert.equal(actualState._charityHashedRandom, 0, "charity hashed random zero");
        assert.equal(actualState._winner, 0, "winner zero");
        assert.equal(actualState._winnerRandom, 0, "winner random zero");
        assert.isOk(actualState._cancelled, "initially cancelled");
        assert.equal(actualState._totalParticipants, 0, "total participants zero");
        assert.equal(actualState._totalEntries, 0, "total entries zero");
        assert.equal(actualState._totalRevealers, 0, "total revealers zero");
        assert.equal(actualState._totalRevealed, 0, "total revealed zero");
    });

});
