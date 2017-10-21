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
    const contractFiles = await dir.promiseFiles(h.contractDir);
    for (let contractFile of contractFiles) {

        // only .sol
        if  (path.extname(contractFile) != '.' + h.contractExt) {
            continue;
        }

        // relative file
        const relativeContractFile = path.relative(h.contractDir, contractFile);
        // remove .sol
        const relativeContractFileNameEnd = relativeContractFile.length - h.contractExt.length - 1;
        const contractName = relativeContractFile.substr(0, relativeContractFileNameEnd);

        contracts[contractName] = {
            file: contractFile,
            relativeFile: relativeContractFile
        }
        
    }

    return contracts;

}

const filterUpdatedContracts = async (contracts) => {
    
    const updatedContracts = {};

    for (let contractName in contracts) {
        const contract = contracts[contractName];
        const hash = await h.getHash(contractName);
        const calculatedHash = await h.calculateHash(contract.file);
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

        let contractAbiDir = path.join(h.abiDir, relativeContractDir);
        let contractBytecodeDir = path.join(h.bytecodeDir, relativeContractDir);
        let contractHashDir = path.join(h.hashDir, relativeContractDir);
        // make sure abi & bytecode & hash dir paths exist
        mkdirp(contractAbiDir);
        mkdirp(contractBytecodeDir);
        mkdirp(contractHashDir);

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
    const relativeContractFileExtIndex = relativeContractFile.indexOf('.' + h.contractExt);
    return relativeContractFile.substr(0, relativeContractFileExtIndex);
}

const getRelativeContractDir = (contractName) => {
    const contractNameLastSlashIndex = contractName.lastIndexOf('/');
    return contractName.substr(0, contractNameLastSlashIndex);
}