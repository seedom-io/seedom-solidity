var artifact = artifacts.require("./charity.sol");

var args = process.argv.slice(3);

contract('charity', (accounts) => {

    if (args.length > 1) {

        describe(args[1], () => {
            require("./charity/" + args[1])(artifact, accounts);
        });

    } else {

        describe("construct", () => {
            require("./charity/construct")(artifact, accounts);
        });

        describe("start", () => {
            require("./charity/start")(artifact, accounts);
        });

        describe("participate", () => {
            require("./charity/participate")(artifact, accounts);
        });

        describe("fund", () => {
            require("./charity/fund")(artifact, accounts);
        });

        describe("reveal", () => {
            require("./charity/reveal")(artifact, accounts);
        });

        describe("end", () => {
            require("./charity/end")(artifact, accounts);
        });

    }

});