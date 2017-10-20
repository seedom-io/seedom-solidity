const dir = require('node-dir');
const util = require('util');
const solc = require('solc');
const path = require("path");
const fs = require('mz/fs');
const mkdirp = require('mz-modules').mkdirp;
const h = require('../helpers');

module.exports = async () => {
    
    console.log('compiling contracts...');

    const files = await h.getFilesOfExt(h.solBase, h.solExt);
    if (files.length === 0) {
        console.log('no contracts found');
        return;
    }

    h.printLines(files);
    const sources = await getSources(files);
    const output = solc.compile({ sources: sources }, true);
    await exportFiles(output.contracts);

    if ('errors' in output) {
        h.printLines(output.errors);
    }

}

const getSources = async (files) => {
    const sources = {};
    for (let file of files) {
        let shortPath = path.relative(h.solBase, file);
        sources[shortPath] = await h.readFile(file);
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
    const shortPathExtIndex = shortPath.indexOf('.' + h.solExt);
    return shortPath.substr(0, shortPathExtIndex);
}

const getShortDirPath = (contractName) => {
    const shortNamePathLastSlashIndex = contractName.lastIndexOf('/');
    return contractName.substr(0, shortNamePathLastSlashIndex);
}