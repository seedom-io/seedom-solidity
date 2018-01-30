const dir = require('node-dir');
const util = require('util');
const solc = require('solc');
const path = require("path");
const fs = require('mz/fs');
const mkdirp = require('mz-modules/mkdirp');
const h = require('./helper');
const cli = require('./cli');

module.exports.main = async (state) => {

    cli.section("compiler");

    state.contracts = await getContracts();
    if (h.objLength(state.contracts) == 0) {
        cli.warning("no solidity contracts found");
        return;
    }

    await compile(state.contracts);

}

const getContracts = async () => {

    const contracts = {};
    const contractFiles = await dir.promiseFiles(h.contractDir);
    for (let contractFile of contractFiles) {

        // only .sol
        if  (path.extname(contractFile) != '.' + h.solExt) {
            continue;
        }

        const relativeContractFile = path.relative(h.contractDir, contractFile);
        const contractName = getContractName(relativeContractFile);

        contracts[contractName] = {
            relativeFile: relativeContractFile,
            source: await h.readSolFile(contractName)
        }

    }

    return contracts;

}

const compile = async (contracts) => {
    const sources = getSources(contracts);
    const output = await solc.compile({ sources: sources }, true);
    await handleOutputs(output.contracts, contracts);
    await handleErrors(output.errors);
    cli.success("contract compilation complete");
}

const getSources = () => {

    const sources = {};
    // flatten sources
    for (let contractName in contracts) {
        const contract = contracts[contractName];
        sources[contract.relativeFile] = contract.source;
    }

    return sources;

}

const handleOutputs = (outputs, contracts) => {

    // retrieve compilation details
    for (let key in outputs) {
        // key: hey/contract.sol:Contract
        // relativeContractFile: hey/contract.sol
        let relativeContractFile = getRelativeContractFile(key);
        // contractName: hey/contract
        let contractName = getContractName(relativeContractFile);
        // relativeContractDir: hey
        let relativeContractDir = getRelativeContractDir(contractName);
        // abi & bytecode dirs
        let abiDir = path.join(h.abiDir, relativeContractDir);
        let bytecodeDir = path.join(h.bytecodeDir, relativeContractDir);
        // make sure abi & bytecode & hash dir paths exist
        mkdirp(abiDir);
        mkdirp(bytecodeDir);

        let output = outputs[key];
        let contract = contracts[contractName];

        contract.abi = output.interface;
        contract.bytecode = '0x' + output.bytecode;
        const metadata = JSON.parse(output.metadata);
        contract.hash = metadata.sources[relativeContractFile].keccak256;

        // save abi & bytecode
        await h.writeAbi(contractName, contract.abi);
        await h.writeBytecode(contractName, contract.bytecode);
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

const handleErrors = (errors, contracts) => {

    if (!errors) {
        return;
    }

    // print out any solc warnings/errors
    for (let line of errors) {
        cli.info(line);
    }

}