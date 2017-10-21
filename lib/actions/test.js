const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('../helpers');
const compile = require('./deploy');
const testrpc = require('../testrpc');
const Mocha = require('mocha');

const testNetworkName = 'local';

const defaultParams = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports = async (suite) => {

    // first deploy
    await deploy();

    const mocha = createMocha();

}

const createMocha = () => {

    const mocha = new Mocha();


}

const getTests = async () => {
    
    const tests = {};
    const testPaths = await dir.promiseFiles(h.testsDir);
    for (let contractPath of contractPaths) {

        // only .sol
        if  (path.extname(contractPath) != '.' + h.contractExt) {
            continue;
        }

        // relative path
        const relativeContractPath = path.relative(h.contractDir, contractPath);
        // remove .sol
        const relativeContractPathNameEnd = relativeContractPath.length - h.contractExt.length - 1;
        const contractName = relativeContractPath.substr(0, relativeContractPathNameEnd);
        contracts[contractName] = {
            path: contractPath,
            relativePath: relativeContractPath
        }
        
    }

    return contracts;

}