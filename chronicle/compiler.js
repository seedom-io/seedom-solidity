const dir = require('node-dir');
const util = require('util');
const solc = require('solc');
const path = require("path");
const fs = require('mz/fs');
const mkdirp = require('mz-modules/mkdirp');
const h = require('./helper');
const cli = require('./cli');

module.exports.main = async (state) => {

    // now compile
    cli.section("compiler");
    
    // get all contracts
    state.contractNames = await getContractNames();
    if (h.objLength(state.contractNames) == 0) {
        cli.error("no solidity contracts found");
        return state;
    }

    // see what contracts actually need updating based on hashes
    state.updatedContractNames = await getUpdatedContractNames(state.contractNames, state.force);
    if (h.objLength(state.updatedContractNames) == 0) {
        cli.success("everything is already compiled");
    } else {
        await compile(state.updatedContractNames);
    }

    return state;

}

const getContractNames = async () => {

    const contractNames = [];
    const contractFiles = await dir.promiseFiles(h.contractDir);
    for (let contractFile of contractFiles) {

        // only .sol
        if  (path.extname(contractFile) != '.' + h.solExt) {
            continue;
        }

        // get contract name and push
        const relativeContractFile = path.relative(h.contractDir, contractFile);
        const contractName = getContractName(relativeContractFile);
        contractNames.push(contractName);
        
    }

    return contractNames;

}

const getUpdatedContractNames = async (contractNames, force) => {

    if (force) {
        return contractNames;
    }
    
    const updatedContractNames = [];

    for (let contractName of contractNames) {

        const contractHash = await h.getContractHash(contractName);
        const calculatedContractHash = await h.calculateContractHash(contractName);

        if (contractHash != calculatedContractHash) {
            updatedContractNames.push(contractName);
        }

    }

    return updatedContractNames;

}

const compile = async (contractNames) => {

    // print out all contracts to be compiled
    for (let contractName of contractNames) {
        cli.info("'%s' will be compiled", contractName);
    }

    const sources = await getSources(contractNames);
    const output = await solc.compile({ sources: sources }, true);
    await exportFiles(output.contracts);
    // print out any solc warnings/errors
    if ('errors' in output) {
        for (let line of output.errors) {
            cli.info(line);
        }
    }

    cli.success("contract compilation complete");

}

const getSources = async (contractNames) => {

    const sources = {};

    for (let contractName of contractNames) {
        const contractFile = h.getContractFile(contractName);
        const relativeContractFile = path.relative(h.contractDir, contractFile);
        sources[relativeContractFile] = await h.readFile(contractFile);
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