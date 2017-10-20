const dir = require('node-dir');
const util = require('util');
const solc = require('solc');
const path = require("path");
const fs = require('mz/fs');
const mkdirp = require('mz-modules').mkdirp;
const h = require('../helpers');

module.exports = async () => {
    
    console.log('compiling contracts...');

    const contracts = await getContracts();
    if (h.objLength(contracts) == 0) {
        console.log('no solidity contracts found');
        return;
    }

    const updatedContracts = await filterUpdatedContracts(contracts);
    if (h.objLength(updatedContracts) == 0) {
        console.log('everything is already compiled');
        return;
    }

    const sources = await covertToSources(updatedContracts);
    const output = solc.compile({ sources: sources }, true);
    await exportFiles(output.contracts);

    if ('errors' in output) {
        h.printLines(output.errors);
    }

    console.log('contract compilation complete');

}

const getContracts = async () => {
    
    const contracts = {};
    const contractPaths = await dir.promiseFiles(h.contractsBase);
    for (let contractPath of contractPaths) {

        // only .sol
        if  (path.extname(contractPath) != '.' + h.contractExt) {
            continue;
        }

        // relative path
        const relativeContractPath = path.relative(h.contractsBase, contractPath);
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

const filterUpdatedContracts = async (contracts) => {
    
    const updatedContracts = {};

    for (let contractName in contracts) {
        const contract = contracts[contractName];
        const hash = await h.getHash(contractName);
        const calculatedHash = await h.calculateHash(contract.path);
        if (hash != calculatedHash) {
            console.log('updated solidity contract "' + contractName + '" will be compiled');
            updatedContracts[contractName] = contract;
        }
    }

    return updatedContracts;

}

const covertToSources = async (contracts) => {

    const sources = {};

    for (let contractName in contracts) {
        const contract = contracts[contractName];
        sources[contract.relativePath] = await h.readFile(contract.path);
    };

    return sources;

}

const exportFiles = async (contracts) => {

    for (let key in contracts) {
        // key: hey/contract.sol:Contract

        // shortPath: hey/contract.sol
        let shortPath = getShortPath(key);
        // contractName: hey/contract
        let contractName = getContractName(shortPath);
        // solShortDirPath: hey
        let shortDirPath = getShortDirPath(contractName);

        let abiDirPath = path.join(h.abiBase, shortDirPath);
        let bytecodeDirPath = path.join(h.bytecodeBase, shortDirPath);
        let hashDirPath = path.join(h.hashBase, shortDirPath);
        // make sure abi & bytecode & hash dir paths exist
        mkdirp(abiDirPath);
        mkdirp(bytecodeDirPath);
        mkdirp(hashDirPath);

        let abiPath = h.getAbiPath(contractName);
        let bytecodePath = h.getBytecodePath(contractName);
        let hashPath = h.getHashPath(contractName);
        
        let contract = contracts[key];
        let interface = contract.interface;
        let bytecode = contract.bytecode;
        let metadata = JSON.parse(contract.metadata);
        let hash = metadata.sources[shortPath].keccak256;

        await h.writeFile(abiPath, interface);
        await h.writeFile(bytecodePath, bytecode);
        await h.writeFile(hashPath, hash);
        
    }

}

const getShortPath = (contractKey) => {
    const keyShortPathEnd = contractKey.indexOf(':');
    return contractKey.substr(0, keyShortPathEnd);
}

const getContractName = (shortPath) => {
    const shortPathExtIndex = shortPath.indexOf('.' + h.contractExt);
    return shortPath.substr(0, shortPathExtIndex);
}

const getShortDirPath = (contractName) => {
    const shortNamePathLastSlashIndex = contractName.lastIndexOf('/');
    return contractName.substr(0, shortNamePathLastSlashIndex);
}