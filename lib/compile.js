const dir = require('node-dir');
const util = require('util');
const solc = require('solc');
const path = require("path");
const fs = require('mz/fs');
const mkdirp = require('mz-modules/mkdirp');
const h = require('./helpers');
const cli = require('./cli');
const init = require('./init');

module.exports = async (force, persist) => {

    // first init
    const previous = await init.initialize(false, true);
    // now compile
    cli.section('compile');
    // get all contracts
    const contracts = await getContracts();
    if (h.objLength(contracts) == 0) {
        cli.warning('no solidity contracts found');
        init.shutdown();
    }

    // see what contracts actually need updating based on hashes
    const updatedContracts = await filterUpdatedContracts(contracts, force);
    if (h.objLength(updatedContracts) == 0) {
        cli.success('everything is already compiled');
    } else {
        await compile(updatedContracts);
    }

    // shut down?
    if (!persist) {
        init.shutdown();
    }

    return Object.assign({
        updatedContracts: updatedContracts,
    }, previous);

}

const getContracts = async () => {
    
    const contracts = {};
    const contractFiles = await dir.promiseFiles(h.contractDir);
    for (let contractFile of contractFiles) {

        // only .sol
        if  (path.extname(contractFile) != '.' + h.solExt) {
            continue;
        }

        // relative file
        const relativeContractFile = path.relative(h.contractDir, contractFile);
        // remove .sol
        const relativeContractFileNameEnd = relativeContractFile.length - h.solExt.length - 1;
        const contractName = relativeContractFile.substr(0, relativeContractFileNameEnd);

        contracts[contractName] = {
            file: contractFile,
            relativeFile: relativeContractFile
        }
        
    }

    return contracts;

}

const filterUpdatedContracts = async (contracts, force) => {

    if (force) {
        return contracts;
    }
    
    const updatedContracts = {};

    for (let contractName in contracts) {
        const contract = contracts[contractName];
        const hash = await h.getHash(contractName);
        const calculatedHash = await h.calculateHash(contract.file);
        if (hash != calculatedHash) {
            updatedContracts[contractName] = contract;
        }
    }

    return updatedContracts;

}

const compile = async (updatedContracts) => {

    printUpdatedContracts(updatedContracts);

    const sources = await covertToSources(updatedContracts);
    const output = await solc.compile({ sources: sources }, true);
    await exportFiles(output.contracts);
    // print out any solc warnings/errors
    if ('errors' in output) {
        h.printLines(output.errors);
    }

    cli.success('contract compilation complete');

}

const printUpdatedContracts = (updatedContracts) => {
    for (let contractName in updatedContracts) {
        cli.info('"%s" will be compiled', contractName);
    }
}

const covertToSources = async (contracts) => {

    const sources = {};

    for (let contractName in contracts) {
        const contract = contracts[contractName];
        sources[contract.relativeFile] = await h.readFile(contract.file);
    };

    return sources;

}

const exportFiles = async (contracts) => {

    for (let key in contracts) {
        // key: hey/contract.sol:Contract

        // relativeContractFile: hey/contract.sol
        let relativeContractFile = getRelativeContractFile(key);
        // contractName: hey/contract
        let contractName = getContractName(relativeContractFile);
        // relativeContractDir: hey
        let relativeContractDir = getRelativeContractDir(contractName);

        let contractbuildAbiDir = path.join(h.buildAbiDir, relativeContractDir);
        let contractbuildBytecodeDir = path.join(h.buildBytecodeDir, relativeContractDir);
        let contractbuildHashDir = path.join(h.buildHashDir, relativeContractDir);
        // make sure abi & bytecode & hash dir paths exist
        mkdirp(contractbuildAbiDir);
        mkdirp(contractbuildBytecodeDir);
        mkdirp(contractbuildHashDir);

        let abiFile = h.getAbiFile(contractName);
        let bytecodeFile = h.getBytecodeFile(contractName);
        let hashFile = h.getHashFile(contractName);
        
        let contract = contracts[key];
        let interface = contract.interface;
        let bytecode = '0x' + contract.bytecode;
        let metadata = JSON.parse(contract.metadata);
        let hash = metadata.sources[relativeContractFile].keccak256;

        await h.writeFile(abiFile, interface);
        await h.writeFile(bytecodeFile, bytecode);
        await h.writeFile(hashFile, hash);
        
    }

}

const getRelativeContractFile = (contractKey) => {
    const keyRelativeContractFileEnd = contractKey.indexOf(':');
    return contractKey.substr(0, keyRelativeContractFileEnd);
}

const getContractName = (relativeContractFile) => {
    const relativeContractFileExtIndex = relativeContractFile.indexOf('.' + h.solExt);
    return relativeContractFile.substr(0, relativeContractFileExtIndex);
}

const getRelativeContractDir = (contractName) => {
    const contractNameLastSlashIndex = contractName.lastIndexOf('/');
    return contractName.substr(0, contractNameLastSlashIndex);
}