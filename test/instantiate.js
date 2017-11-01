const instantiate = require('../stage/instantiate');

suite('instantiate', (state) => {

    test("should set the owner to us", async () => {
        await instantiate.stage(state);
        const stage = state.stage;
        var actualOwner = await state.web3Instances.charity.methods.owner().call({from: stage.owner});
        assert.equalIgnoreCase(actualOwner, stage.owner, "owner wasn't us");
    });

    test("should have zeroed out properties", async () => {

        await instantiate.stage(state);

        const stage = state.stage;

        const actualWinner = await state.web3Instances.charity.methods.winner().call({ from: stage.owner });
        const actualCancelled = await state.web3Instances.charity.methods.cancelled().call({ from: stage.owner });
        const actualTotalEntries = await state.web3Instances.charity.methods.totalEntries().call({ from: stage.owner });
        const actualTotalRevealed = await state.web3Instances.charity.methods.totalRevealed().call({ from: stage.owner });
        const actualTotalParticipants = await state.web3Instances.charity.methods.totalParticipants().call({ from: stage.owner });
        const actualTotalRevealers = await state.web3Instances.charity.methods.totalRevealers().call({ from: stage.owner });

        assert.equal(actualWinner, 0, "winner zero");
        assert.isOk(actualCancelled, "initially cancelled");
        assert.equal(actualTotalEntries, 0, "total entries zero");
        assert.equal(actualTotalRevealed, 0, "total revealed zero");
        assert.equal(actualTotalParticipants, 0, "total participants zero");
        assert.equal(actualTotalRevealers, 0, "total revealers zero");

    });

});
