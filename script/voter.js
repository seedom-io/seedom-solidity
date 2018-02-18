const h = require('./helper');

module.exports.options = [
    ['from', true],
    ['charityNames', true],
    ['charityAddresses', true],
    ['endTime', true]
];

module.exports.run = async (state) => {

    const { env } = state;

    const seedom = await state.interfaces.seedom;
    const seedomContractAddress = seedom.receipt.contractAddress;
    const seeder = await state.interfaces.seeder;

    env.seederReceipt = await seeder.deploy({
        charityNames: env.charityNames,
        charityAddresses: env.charityAddresses,
        endTime: env.endTime
    }, {
        from: env.from
    });

}