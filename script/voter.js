const h = require('./helper');

module.exports.options = [
    ['from', true],
    ['charityNameStrings', true],
    ['charityAddresses', true],
    ['endTime', true]
];

module.exports.run = async (state) => {

    const { env } = state;

    env.charityNames = [];
    for (const charityNameString of env.charityNameStrings) {
        env.charityNames.push(h.hexRandom(charityNameString));
    }
    
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