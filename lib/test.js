const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('./helpers');
const deploy = require('./deploy');
const init = require('./init');
const cli = require('./cli');
const Mocha = require('mocha');

const testTimeout = 10000;
const beforeTimeout = 10000;

const defaultParams = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports = async (suiteNames, persist) => {

    // first deploy
    const previous = await deploy(null, false, true);
    // now test
    cli.section('test');

    // grab web3
    const web3 = previous.web3;
    const accounts = previous.accounts;
    // set up suite
    setupSuite(web3, accounts);

    // get test files for suites
    const testFiles = await getTestsFiles(suiteNames);
    const mocha = createMocha(testFiles);
    await promiseRun(mocha);

    // shut down?
    if (!persist) {
        init.shutdown();
    }

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

const setupSuite = (web3, accounts) => {

    global.suite = (name, tests) => {
        
        Mocha.describe(name, () => {

            var snapshot;
    
            beforeEach(async () => {
                // save fresh snapshot
                //snapshot = await simulator.snapshot(web3);
            });
    
            afterEach(async () => {
                //await simulator.revert(snapshot, web3);
            });

            tests(accounts);
    
        });
    
    }

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

    runner.on('suite', function(suite) {
        
        if (!suite.fullTitle()) {
            return;
        }

        cli.subsection('%s', suite.fullTitle());

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