suite('instantiate', (accounts) => {

    var validOwner = accounts[0];

    test("should set the owner to us", async (contracts) => {
        var actualOwner = await contracts.charity.methods.owner().call({from: validOwner});
        assert.equalIgnoreCase(actualOwner, validOwner, "owner wasn't us");
    });

});
