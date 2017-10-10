var artifact = artifacts.require("./charity.sol");

contract('Charity', (accounts) => {

    describe("Construct", () => {
        require("./charity/construct")(artifact, accounts);
    });

    describe("Start", () => {
        require("./charity/start")(artifact, accounts);
    });

    describe("Participate", () => {
        require("./charity/participate")(artifact, accounts);
    });

});