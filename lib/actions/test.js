const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('../helpers');
const deploy = require('./deploy');
const testrpc = require('../testrpc');
const Mocha = require('mocha');

const testNetworkName = 'local';

const defaultParams = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports = async (suites) => {

    // first deploy
    await deploy();

    const testFiles = await getTestsFiles(suites);
    const mocha = createMocha(testFiles);
    await mocha.run();

}

const getSuites = (suiteStrings) => {
    suiteStrings = suitesString.split(',')
    for (let suiteString of suiteStrings)
}

const getTestsFiles = async (suites) => {

    let testFiles = [];
    
    if (suites && (suites.length > 0)) {
        for (let suite of suites) {
            testFiles.push(path.join(h.testDir, suite, j.jsExt));
        }
    } else {
        testFiles = await dir.promiseFiles(h.testDir);
        testFiles = testFiles.filter(file => path.extname(file) == '.' + h.jsExt);
    }
    
    return testFiles;

}

const createMocha = (testFiles) => {

    const mocha = new Mocha();
    for (let testFile of testFiles) {
        mocha.addFile(testFile);
    }

    return mocha;

}
