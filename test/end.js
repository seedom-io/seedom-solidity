const end = require('../script/simulation/end');

suite('end', (state) => {

    test("should choose a winner", async () => {

        // first end
        await end.run(state);

        const { env } = state;

        let foundWinner = false;
        const winner = env.winner.toLowerCase();
        for (let participant of env.participants) {
            if (participant.address.toLowerCase() === winner) {
                foundWinner = true;
            }
        }

        assert.isOk(foundWinner, "one of the participants that revealed should have won");

    });

});