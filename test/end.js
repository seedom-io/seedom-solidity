const end = require('../script/simulation/end');

suite('end', (state) => {

    test("should choose a winner", async () => {

        // first end
        await end.run(state);

        const { env } = state;

        const actualState = await (await state.interfaces.seedom).state({ from: env.owner });
        assert.equalIgnoreCase(actualState.charityRandom, env.charityRandom, "charity random does not match");

        let foundWinner = false;
        const winner = actualState.winner.toLowerCase();
        for (let participant of env.participants) {
            if (participant.address.toLowerCase() === winner) {
                foundWinner = true;
            }
        }

        assert.isOk(foundWinner, "one of the participants that revealed should have won");

    });

});