var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var th = require('./helpers');
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

    var validCharityRandom = th.random();
    var validCharityHashedRandom = th.hashedRandom(validCharityRandom, validCharity);

    test("should withdraw no funds initially", async () => {

        var instance = await artifact.new();

        var initialBalance = getLatestBalance(validOwner);
        mochaLogger.pending("initial balance: " + initialBalance.toString());

        var result = await contracts.charity.methods.withdraw({ from: validOwner });
        var transactionCost = calculateTransactionCost(result.receipt);

        var actualFinalBalance = getLatestBalance(validOwner);
        mochaLogger.pending("final balance: " + actualFinalBalance.toString());

        var validFinalBalance = initialBalance.minus(transactionCost);
        mochaLogger.pending("valid final balance: " + validFinalBalance.toString());

        assert.isOk(actualFinalBalance.equals(validFinalBalance), "balance did not remain same");

    });

    test("should withdraw partial entry refunds", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        var instance = await artifact.new();

        var validFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("initial balance: " + validFinalBalance.toString());

        await contracts.charity.methods.kickoff(
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

        await contracts.charity.methods.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await th.sleep(th.timeInterval + (th.timeInterval / 2));

        var result = await contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        );
        var transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);

        // run fallback function
        result = await contracts.charity.methods.sendTransaction({ from: validParticipant, value: 10500 });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.minus(10500);

        result = await contracts.charity.methods.withdraw({ from: validParticipant });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.plus(500);

        var actualFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("final balance: " + actualFinalBalance.toString());

        assert.isOk(actualFinalBalance.equals(validFinalBalance),
            "balance was not refunded " + actualFinalBalance.toString() + " != " + validFinalBalance.toString());

    });

    test("should withdraw partial entry and winning funds", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        var instance = await artifact.new();

        var validFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("initial balance: " + validFinalBalance.toString());

        await contracts.charity.methods.kickoff(
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

        await contracts.charity.methods.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await th.sleep(th.timeInterval + (th.timeInterval / 2));

        var result = await contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        );
        var transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);

        // run fallback function
        result = await contracts.charity.methods.sendTransaction({ from: validParticipant, value: 10500 });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.minus(10500);

        await th.sleep(th.timeInterval);

        result = await contracts.charity.methods.reveal(
            validRandom,
            { from: validParticipant }
        );
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);

        await th.sleep(th.timeInterval);

        await contracts.charity.methods.end(validCharityRandom, { from: validCharity });

        var validWinnings = 10 * validValuePerEntry * validWinnerSplit / 100;
        mochaLogger.pending("valid winnings: " + validWinnings);
        validFinalBalance = validFinalBalance.plus(validWinnings);

        result = await contracts.charity.methods.withdraw({ from: validParticipant });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.plus(500);

        var actualFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("final balance: " + actualFinalBalance.toString());

        assert.isOk(actualFinalBalance.equals(validFinalBalance),
            "partial entry and winnings not refunded " + actualFinalBalance.toString() + " != " + validFinalBalance.toString());

    });

    test("should withdraw partial entry and cancelled funds", async () => {

        var validRandom = th.random();
        var validHashedRandom = th.hashedRandom(validRandom, validParticipant);

        var validStartTime = th.now() + th.timeInterval;
        var validRevealTime = validStartTime + th.timeInterval;
        var validEndTime = validRevealTime + th.timeInterval;

        var instance = await artifact.new();

        var validFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("initial balance: " + validFinalBalance.toString());

        await contracts.charity.methods.kickoff(
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

        await contracts.charity.methods.seed(validCharityHashedRandom, { from: validCharity });

        // wait for charity to start
        await th.sleep(th.timeInterval + (th.timeInterval / 2));

        var result = await contracts.charity.methods.participate(
            validHashedRandom,
            { from: validParticipant }
        );
        var transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);

        // run fallback function
        result = await contracts.charity.methods.sendTransaction({ from: validParticipant, value: 10500 });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.minus(10500);

        await contracts.charity.methods.cancel({ from: validOwner });

        result = await contracts.charity.methods.withdraw({ from: validParticipant });
        transactionCost = calculateTransactionCost(result.receipt);
        validFinalBalance = validFinalBalance.minus(transactionCost);
        validFinalBalance = validFinalBalance.plus(10500);

        var actualFinalBalance = getLatestBalance(validParticipant);
        mochaLogger.pending("final balance: " + actualFinalBalance.toString());

        assert.isOk(actualFinalBalance.equals(validFinalBalance),
            "partial entry and cancelled funds not refunded " + actualFinalBalance.toString() + " != " + validFinalBalance.toString());

    });

}
