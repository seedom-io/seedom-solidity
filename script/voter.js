const h = require('./helper');

module.exports.options = [
    ['from', true],
    ['charityNameStrings', true],
    ['endTime', true]
];

module.exports.run = async (state) => {

    const { env } = state;

    env.charityNames = [];
    env.charityAddresses = [];
    for (const charityNameString of env.charityNameStrings) {
        env.charityNames.push(h.hexRandom(charityNameString));
        env.charityAddresses.push("0x0003dFf23dD77e4D74730d7DA3A0a672A5140D34");
    }
    
    const seedom = await state.interfaces.seedom;
    const seedomContractAddress = seedom.receipt.contractAddress;
    const seeder = await state.interfaces.seeder;

    env.seederReceipt = await seeder.deploy({
        charityNames: env.charityNames,
        charityAddresses: env.charityAddresses,
        endTime: env.endTime,
        seedomAddress: seedom.receipt.contractAddress
    }, {
        from: env.from
    });

}