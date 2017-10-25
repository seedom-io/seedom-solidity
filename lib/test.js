const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('./helpers');
const simulate = require('./simulate');
const parity = require('./parity');
const cli = require('./cli');
const Mocha = require('mocha');

const testTimeout = 10000;
const beforeTimeout = 10000;

const defaultParams = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports = async (suiteNames) => {

    await geth.getAccounts();
    /*
    // first simulate
    const simulateResult = await simulate(true);
    // now test
    cli.section('test');

    const web3 = simulateResult.web3;
    const simulation = simulateResult.simulation;

    setupContract(web3);

    // get test files for suites
    const testFiles = await getTestsFiles(suiteNames);

    const mocha = createMocha(testFiles);
    await promiseRun(mocha);

    // close simulation
    simulation.close();*/

}

const promiseRun = (mocha) => {
    return new Promise((fulfill, reject) => {
        mocha.run().on('end', () => {
            fulfill();
        });
    });
}

const getTestsFiles = async (suiteNames) => {
    
    if (suiteNames.length > 0) {

        const testFiles = [];

        for (let suiteName of suiteNames) {
            testFiles.push(path.join(h.testDir, suiteName, j.jsExt));
        }

        return testFiles;

    } else {

        const testFiles = await dir.promiseFiles(h.testDir);
        return testFiles.filter(file => path.extname(file) == '.' + h.jsExt);

    }

}

const setupContract = (web3) => {

    global.suite = (name, tests) => {
        
        Mocha.describe(name, () => {

            var snapshot;
    
            beforeEach(async () => {
                // save fresh snapshot
                snapshot = await simulator.snapshot(web3);
            });
    
            afterEach(async () => {
                await simulator.revert(snapshot, web3);
            });

            tests(1);
    
        });
    
    }

}

const createMocha = (testFiles) => {

    const mocha = new Mocha({
        reporter: MyReporter
    });
    for (let testFile of testFiles) {
        mocha.addFile(testFile);
    }

    return mocha;

}

function MyReporter(runner) {

    runner.on('suite', function(suite) {
        
        if (!suite.fullTitle()) {
            return;
        }

        cli.message('%s', suite.fullTitle());

    });
    
    runner.on('pass', function(test) {
        cli.success('%s', test.fullTitle());
    });

    runner.on('fail', function(test, err){
        cli.error('%s', test.fullTitle());
    });

    runner.on('end', function(){
    });

}