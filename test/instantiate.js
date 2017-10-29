const instantiate = require('../stage/instantiate');

suite('instantiate', () => {

    test("should set the owner to us", async (stage) => {
        await instantiate.stage(stage);
        var actualOwner = await stage.contracts.charity.methods.owner().call({from: stage.owner});
        assert.equalIgnoreCase(actualOwner, stage.owner, "owner wasn't us");
    });

});
