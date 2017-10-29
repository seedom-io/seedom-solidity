const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('./helper');
const deployer = require('./deployer');
const parity = require('./parity');
const cli = require('./cli');
const Mocha = require('mocha');

global.chai = require('chai');
global.chai.use(require('chai-as-promised'));
global.chai.use(require('chai-string'));
global.assert = global.chai.assert;

const testTimeout = 10000;
const beforeTimeout = 10000;

const defaultParams = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports = async (suiteNames, persist) => {

    const state = {};
    
    // do a first deploy (test network, yes force, yes forget, and yes persist)
    state.deployer = await deployer.all(null, true, true, true);
    // get parity as a force deployment will have started it
    state.parity = state.deployer.parity;

    // now test
    cli.section("tester");

    // grab additional stuff required for testing
    state.web3 = state.parity.web3;
    state.accountAddresses = state.parity.accountAddresses;
    state.deploymentPlans = state.deployer.deploymentPlans;
    state.web3Instances = state.deployer.web3Instances;
    // set up suite
    setupSuite(state.accountAddresses, state.deploymentPlans, state.web3Instances, state.web3);

    // get test files for suites
    const testFiles = await getTestFiles(suiteNames);
    const mocha = createMocha(testFiles);
    await promiseRun(mocha);

    // kill parity
    if (!persist) {
        state.parity.execution.process.kill();
    }

}

const promiseRun = (mocha) => {
    return new Promise((fulfill, reject) => {
        mocha.run().on('end', () => {
            fulfill();
        });
    });
}

const getTestFiles = async (suiteNames) => {
    
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

const setupSuite = (accountAddresses, deploymentPlans, web3Instances, web3) => {

    global.suite = (name, tests) => {
        Mocha.describe(name, function () {
            tests();
        });
    };

    global.test = (name, code) => {
        
        Mocha.it(name, async () => {

            // setup initial stage
            const stage = {
                accountAddresses: accountAddresses,
                web3Instances: web3Instances,
                web3: web3,
                options: {}
            };

            return await code(stage);

            // get new web 3 instances for next test
            web3Instances = await deployer.again(deploymentPlans, web3);

        });

    };

}

const createMocha = (testFiles) => {

    const mocha = new Mocha({
        reporter: reporter
    });
    for (let testFile of testFiles) {
        mocha.addFile(testFile);
    }

    return mocha;

}

function reporter(runner) {

    var passes = 0;
    var failures = 0;

    runner.on('suite', (suite) => {
        
        if (!suite.fullTitle()) {
            return;
        }

        cli.suite(suite.fullTitle());

    });
    
    runner.on('pass', (test) => {
        cli.pass(test.fullTitle());
        passes++;
    });

    runner.on('fail', (test, err) => {
        cli.fail(test.fullTitle(), err.message);
        failures++;
    });

    runner.on('end', () => {

        cli.subsection("results");

        if (failures > 0) {
            cli.error("%d total failures", failures);
        }

        cli.success("%d total passes", passes);

    });

}