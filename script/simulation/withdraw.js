const end = require('./end');

module.exports.run = async (state) => {

    // run through end emulation
    await end.run(state);

    const { env } = state;
    const seedom = await state.interfaces.seedom;

    env.charityWithdrawReceipt = await seedom.withdraw({
        from: env.charity, transact: true
    });

    env.winnerWithdrawReceipt = await seedom.withdraw({
        from: env.winner, transact: true
    });

    env.ownerWithdrawReceipt = await seedom.withdraw({
        from: env.owner, transact: true
    });

}