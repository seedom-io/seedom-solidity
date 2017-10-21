var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var helpers = require('../helpers');
var mochaLogger = require('mocha-logger');
var BigNumber = require('bignumber.js');

function getLatestBalance(address) {
    var latestBlock = web3.eth.getBlock('latest');
    var latestBlockNumber = latestBlock.number;
    mochaLogger.pending("latest block number: " + latestBlockNumber);
    return web3.eth.getBalance(address, latestBlockNumber);
}

function calculateTransactionCost(receipt) {
    var gasUsed = receipt.gasUsed;
    var gasPrice = 100000000000;
    var transactionCost = gasPrice * gasUsed;
    mochaLogger.pending("gas used: " + gasUsed);
    mochaLogger.pending("gas price: " + gasPrice);
    mochaLogger.pending("transaction cost: " + transactionCost);
    return new BigNumber(transactionCost);
}

module.exports = (artifact, accounts) => {

    var validOwner = accounts[0];
    var validCharity = accounts[1];
    var validParticipant = accounts[2];
    var validParticipant2 = accounts[3];
    var validParticipant3 = accounts[4];
    var validParticipant4 = accounts[5];
    var validCharitySplit = 49;
    var validWinnerSplit = 49;
    var validOwnerSplit = 2;
    var validValuePerEntry = 1000;

    var validCharityRandom = helpers.random();
    var validCharityHashedRandom = helpers.hashedRandom(validCharityRandom, validCharity);

    it("should withdraw no funds initially", async () => {

        var instance = await artifact.new();

        var initialBalance = getLatestBalance(validOwner);
        mochaLogger.pending("initial balance: " + initialBalance.toString());

        var result = await instance.withdraw({ from: validOwner });
        var transactionCost = calculateTransactionCost(result.receipt);

        var actualFinalBalance = getLatestBalance(validOwner);
        mochaLogger.pending("final balance: " + actualFinalBalance.toString());

        var validFinalBalance = initialBalance.minus(transactionCost);
        mochaLogger.pending("valid final balance: " + validFinalBalance.toString());

        assert.isOk(actualFinalBalance.equals(validFinalBalance), "balance did not remain same");

    });

    it("should withdraw partial entry refunds", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        var validFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("initial balance: " + validFinalBalance.toString());

        await instance.kickoff(
            validCharity,
            validCharitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        await instance.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        var result = await instance.participate(
            validHashedRandom,
            { from: validParticipant }
        );
        var transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);

        // run fallback function
        result = await instance.sendTransaction({ from: validParticipant, value: 10500 });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.minus(10500);

        result = await instance.withdraw({ from: validParticipant });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.plus(500);

        var actualFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("final balance: " + actualFinalBalance.toString());

        assert.isOk(actualFinalBalance.equals(validFinalBalance),
            "balance was not refunded " + actualFinalBalance.toString() + " != " + validFinalBalance.toString());

    });

    it("should withdraw partial entry and winning funds", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        var validFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("initial balance: " + validFinalBalance.toString());

        await instance.kickoff(
            validCharity,
            validCharitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        await instance.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        var result = await instance.participate(
            validHashedRandom,
            { from: validParticipant }
        );
        var transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);

        // run fallback function
        result = await instance.sendTransaction({ from: validParticipant, value: 10500 });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.minus(10500);

        await helpers.sleep(helpers.timeInterval);

        result = await instance.reveal(
            validRandom,
            { from: validParticipant }
        );
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);

        await helpers.sleep(helpers.timeInterval);

        await instance.end(validCharityRandom, { from: validCharity });

        var validWinnings = 10 * validValuePerEntry * validWinnerSplit / 100;
        mochaLogger.pending("valid winnings: " + validWinnings);
        validFinalBalance = validFinalBalance.plus(validWinnings);

        result = await instance.withdraw({ from: validParticipant });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.plus(500);

        var actualFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("final balance: " + actualFinalBalance.toString());

        assert.isOk(actualFinalBalance.equals(validFinalBalance),
            "partial entry and winnings not refunded " + actualFinalBalance.toString() + " != " + validFinalBalance.toString());

    });

    it("should withdraw partial entry and cancelled funds", async () => {

        var validRandom = helpers.random();
        var validHashedRandom = helpers.hashedRandom(validRandom, validParticipant);

        var validStartTime = helpers.now() + helpers.timeInterval;
        var validRevealTime = validStartTime + helpers.timeInterval;
        var validEndTime = validRevealTime + helpers.timeInterval;

        var instance = await artifact.new();

        var validFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("initial balance: " + validFinalBalance.toString());

        await instance.kickoff(
            validCharity,
            validCharitySplit,
            validWinnerSplit,
            validOwnerSplit,
            validValuePerEntry,
            validStartTime,
            validRevealTime,
            validEndTime,
            { from: validOwner }
        );

        await instance.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await helpers.sleep(helpers.timeInterval + (helpers.timeInterval / 2));

        var result = await instance.participate(
            validHashedRandom,
            { from: validParticipant }
        );
        var transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);

        // run fallback function
        result = await instance.sendTransaction({ from: validParticipant, value: 10500 });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.minus(10500);

        await instance.cancel({ from: validOwner });

        result = await instance.withdraw({ from: validParticipant });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.plus(10500);

        var actualFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("final balance: " + actualFinalBalance.toString());

        assert.isOk(actualFinalBalance.equals(validFinalBalance),
            "partial entry and cancelled funds not refunded " + actualFinalBalance.toString() + " != " + validFinalBalance.toString());

    });

}
