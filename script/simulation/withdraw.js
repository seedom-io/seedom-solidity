const end = require('./end');

module.exports.run = async (state) => {

    // run through select emulation
    await end.run(state);

    const { env } = state;
    const fundraiser = await state.interfaces.fundraiser;

    env.causeWithdrawReceipt = await fundraiser.withdraw({
        from: env.cause, transact: true
    });

    env.participantWithdrawReceipt = await fundraiser.withdraw({
        from: env.participant, transact: true
    });

    env.ownerWithdrawReceipt = await fundraiser.withdraw({
        from: env.owner, transact: true
    });

}