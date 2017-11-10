const instantiate = require('../stage/instantiate');

suite('instantiate', (state) => {

    test("should set the owner to us", async () => {
        await instantiate.stage(state);
        const stage = state.stage;
        const actualOwner = await stage.instances.seedom.methods.owner().call({from: stage.owner});
        assert.equalIgnoreCase(actualOwner, stage.owner, "owner wasn't us");
    });

    test("should have zeroed out properties", async () => {

        await instantiate.stage(state);

        const stage = state.stage;

        const actualWinner = await stage.instances.seedom.methods.winner().call({ from: stage.owner });
        const actualCancelled = await stage.instances.seedom.methods.cancelled().call({ from: stage.owner });
        const actualTotalEntries = await stage.instances.seedom.methods.totalEntries().call({ from: stage.owner });
        const actualTotalRevealed = await stage.instances.seedom.methods.totalRevealed().call({ from: stage.owner });
        const actualTotalParticipants = await stage.instances.seedom.methods.totalParticipants().call({ from: stage.owner });
        const actualTotalRevealers = await stage.instances.seedom.methods.totalRevealers().call({ from: stage.owner });

        assert.equal(actualWinner, 0, "winner zero");
        assert.isOk(actualCancelled, "initially cancelled");
        assert.equal(actualTotalEntries, 0, "total entries zero");
        assert.equal(actualTotalRevealed, 0, "total revealed zero");
        assert.equal(actualTotalParticipants, 0, "total participants zero");
        assert.equal(actualTotalRevealers, 0, "total revealers zero");

    });

});
