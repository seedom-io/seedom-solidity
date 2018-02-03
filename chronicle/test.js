const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('./helper');
const compile = require('./compile');
const parity = require('./parity');
const cli = require('./cli');
const stager = require('./stager');
const Mocha = require('mocha');

global.chai = require('chai');
global.chai.use(require('chai-as-promised'));
global.chai.use(require('chai-string'));
global.assert = global.chai.assert;

const testTimeout = 100000;

module.exports.main = async (state) => {

    // compile first
    await compile.main(state);

    // get parity state
    if (!(await parity.main(state))) {
        return false;
    }

    // now test
    cli.section("test");

    // set up suite against state
    setupSuite(state);

    // get test files for suites
    const testFiles = await getTestFiles(state.suiteNames);
    const mocha = createMocha(testFiles);
    await promiseRun(mocha);

    return state;

}

const setupSuite = (state) => {

    global.suite = (name, tests) => {
        Mocha.describe(name, function() {

            beforeEach('reset', async () => {
                // clear the stage before each test
                state.stage = {};
            });

            tests(state);

        });
    };

    global.test = (name, code) => {
        
        Mocha.it(name, async function() {
            this.timeout(testTimeout);
            return await code();
        });

    };

}

const promiseRun = (mocha) => {
    return new Promise((fulfill, reject) => {
        mocha.run().on('end', () => {
            fulfill();
        });
    });
}

const getTestFiles = async (suiteNames) => {
    
    if (suiteNames && (suiteNames.length > 0)) {

        const testFiles = [];

        for (let suiteName of suiteNames) {
            testFiles.push(path.join(h.testDir, suiteName + '.' + h.jsExt));
        }

        return testFiles;

    } else {

        const testFiles = await dir.promiseFiles(h.testDir);
        return testFiles.filter(file => path.extname(file) == '.' + h.jsExt);

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