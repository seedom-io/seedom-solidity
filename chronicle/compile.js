const dir = require('node-dir');
const util = require('util');
const solc = require('solc');
const path = require("path");
const fs = require('mz/fs');
const mkdirp = require('mz-modules/mkdirp');
const h = require('./helper');
const cli = require('./cli');

const importRegex = /import\s+\"(.+.sol)\";/gm;

const defaultSolcInput = {
    language: "Solidity",
    settings: {
        optimizer: {
            enabled: true,
            runs: 500
        },
        outputSelection: {
            "*": {
                "*": [
                    "abi",
                    "evm.bytecode.object",
                    "evm.bytecode.sourceMap",
                    "evm.deployedBytecode.object",
                    "evm.deployedBytecode.sourceMap"
                ]
            }
        }
    }
}

module.exports.prepare = async (program, state) => {

    cli.section("Compile");

    state.contracts = await getContracts();
    if (h.objLength(state.contracts) == 0) {
        cli.warning("no solidity contracts found");
        return;
    }

    await prepareContracts(state.contracts);

    if (!(await compile(state.contracts))) {
        return;
    }

    cli.success("contract compilation complete");

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
        const relativeContractDir = getRelativeContractDir(contractName);
        const contractSource = await h.readFile(contractFile);

        contracts[contractName] = {
            name: contractName,
            relativeFile: relativeContractFile,
            relativeDir: relativeContractDir,
            source: contractSource
        }

    }

    return contracts;

}

const prepareContracts = async (contracts) => {
    for (let contractName in contracts) {

        const contract = contracts[contractName];
        const contractHash = prepareContract(contract, contracts);
        const currentContractHash = await h.readHash(contractName);
        // if the existing and new hashes don't match, set to compile
        if (contractHash !== currentContractHash) {
            setCompiled(contract, false);
        } else {
            // else load existing output into contract
            Object.assign(contract, await h.readOutput(contractHash));
        }

    }
}

const prepareContract = (contract, contracts) => {

    // skip if we already have a hash
    if (contract.hash) {
        return contract.hash;
    }

    // seed contract hash with source
    const data = [contract.source];
    // check for any imports
    let match = importRegex.exec(contract.source);
    // we have imports, prepare them too
    if (match) {

        // track imports
        contract.imports = [];
        // get all import files from source
        do {

            const importFile = match[1];
            const relativeContractImportFile = path.join(contract.relativeDir, importFile);
            const importContractName = getContractName(relativeContractImportFile);
            // make sure we have the import
            if (!(importContractName in contracts)) {
                throw new Error(`dependency ${relativeContractImportFile} not found`);
            }

            const importContract = contracts[importContractName];
            // save dependency
            contract.imports.push(importContract);
            // obtain import hash
            const importContractHash = prepareContract(importContract, contracts);
            // combine with source and other import hashes
            data.push(importContractHash);

        } while (match = importRegex.exec(contract.source));

    }

    // set our true hash
    contract.hash = h.calculateHash(data);
    return contract.hash;

}

const setCompiled = (contract, compiled) => {
    contract.compiled = compiled;
    // set compiled status of imports
    if ('imports' in contract) {
        for (let importContract of contract.imports) {
            setCompiled(importContract, compiled);
        }
    }
}

const compile = async (contracts) => {
    
    for (let contractName in contracts) {

        const contract = contracts[contractName];

        // are we set to compile
        if (!('compiled' in contract)) {
            cli.info(`compilation not required for ${contractName}`);
            continue;
        }

        // skip compiled contracts
        if (contract.compiled) {
            cli.info(`compilation already completed for ${contractName}`);
            continue;
        }

        cli.info(`${contractName} will be compiled`);

        var solcInput = {
            ...defaultSolcInput,
            sources: await getSources(contract)
        };

        const output = JSON.parse(
            await solc.compileStandard(JSON.stringify(
                solcInput
            ))
        );

        // check for errors
        if (!(await handleErrors(output.errors))) {
            return false;
        }

        // handle outputs
        await handleOutputs(output.contracts, contracts);
        // set tree compiled
        setCompiled(contract, true);

    }

    return true;

}

const getSources = (contract) => {

    const sources = {};
    // add this contract's source
    sources[contract.relativeFile] = {
        content: contract.source
    };

    // add sources of all import contracts
    if ('imports' in contract) {
        for (let importContract of contract.imports) {
            Object.assign(sources, getSources(importContract));
        }
    }

    return sources;

}

const handleErrors = (errors) => {

    if (!errors) {
        return true;
    }

    let hasErrors = false;
    // print out any solc warnings/errors
    for (let error of errors) {
        if (error.severity != "warning") {
            cli.error(error.formattedMessage);
            hasErrors = true;
        } else {
            cli.warning(error.formattedMessage);
        }
    }

    return hasErrors;

}

const handleOutputs = async (outputs, contracts) => {

    // retrieve compilation details
    for (let relativeContractFile in outputs) {

        // contractName: hey/contract
        const contractName = getContractName(relativeContractFile);
        // relativeContractDir: hey
        const relativeContractDir = getRelativeContractDir(contractName);
        // hash & output dirs
        const hashDir = path.join(h.hashDir, relativeContractDir);
        const outputDir = path.join(h.outputDir, relativeContractDir);
        // make hash and output dirs exist
        mkdirp(hashDir);
        mkdirp(outputDir);

        let output = outputs[relativeContractFile];
        // first element in output is the contract/library
        output = output[Object.keys(output)[0]];
        // flatten methods and args
        output.methods = getContractMethods(output.abi);

        // grab the contract and merge with output
        let contract = contracts[contractName];
        Object.assign(contract, output);

        // save hash & output
        await h.writeHash(contractName, contract.hash);
        await h.writeOutput(contract.hash, output);

    }

};

const getContractName = (relativeContractFile) => {
    const relativeContractFileExtIndex = relativeContractFile.indexOf('.' + h.solExt);
    return relativeContractFile.substr(0, relativeContractFileExtIndex);
};

const getRelativeContractDir = (contractName) => {
    const contractNameLastSlashIndex = contractName.lastIndexOf('/');
    return contractName.substr(0, contractNameLastSlashIndex);
};

const getContractMethods = (abi) => {

    const methods = {};

    for (let component of abi) {

        let methodName;
        // rebrand constructor as deploy
        if (component.type === 'function') {
            methodName = component.name;
        } else if (component.type === 'constructor') {
            methodName = 'deploy';
        } else if (component.type === 'fallback') {
            methodName = 'fallback';
        } else {
            continue;
        }

        methods[methodName] = getContractMethodArgs(component);
        
    }

    return methods;

};

const getContractMethodArgs = (component) => {

    if (!('inputs' in component)) {
        return [];
    }

    const args = [];
    for (let input of component.inputs) {
        args.push(input.name);
    }

    return args;

};