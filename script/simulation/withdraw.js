const select = require('./select');

module.exports.run = async (state) => {

    // run through select emulation
    await select.run(state);

    const { env } = state;
    const seedom = await state.interfaces.seedom;

    env.charityWithdrawReceipt = await seedom.withdraw({
        from: env.charity, transact: true
    });

    env.selectedWithdrawReceipt = await seedom.withdraw({
        from: env.selected, transact: true
    });

    env.ownerWithdrawReceipt = await seedom.withdraw({
        from: env.owner, transact: true
    });

}