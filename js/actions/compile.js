const dir = require('node-dir');
const util = require('util');
const solc = require('solc');
const path = require("path");
const fs = require('mz/fs');
const helpers = require('../helpers');

const solBase = 'sol';
const abiBase = 'abi';
const bytecodeBase = 'bytecode';
const configBase = 'config';
const hashesConfigFilePath = path.join(configBase, 'hashes.json');

module.exports = async () => {
    
    console.log('compiling contracts...');

    const files = await helpers.getFilesOfExtInDir(solBase);
    if (files.length === 0) {
        console.log('no contracts found');
        return;
    }

    helpers.printLines(files);
    const sources = await getSources(files);
    const output = solc.compile({ sources: sources }, true);
    let hashes = await exportFiles(output.contracts);
    await helpers.mergeObjectIntoJsonFile(hashes, hashesConfigFilePath);

    if ('errors' in output) {
        helpers.printLines(output.errors);
    }

}

var getSources = async (files) => {
    let sources = {};
    for (let file of files) {
        let relativeFile = path.relative(solBase, file);
        sources[relativeFile] = await fs.readFile(file, 'utf8');
    };
    return sources;
}

var exportFiles = async (contracts) => {

    let hashes = {};

    for (let solKey in contracts) {
        // solKey: hey/contract.sol:Contract

        let solKeyFilePathEnd = solKey.indexOf(':');
         // solFilePath: hey/contract.sol
        let solFilePath = solKey.substr(0, solKeyFilePathEnd);

        let solFilePathExtIndex = solFilePath.indexOf('.sol');
        // solFileNamePath: hey/contract
        let solFileNamePath = solFilePath.substr(0, solFilePathExtIndex);
        let solFileNamePathLastSlashIndex = solFileNamePath.lastIndexOf('/');
        // solDirPath: hey
        let solDirPath = solFileNamePath.substr(0, solFileNamePathLastSlashIndex);

        // abiDirPath: abi/hey
        let abiDirPath = path.join(abiBase, solDirPath);
        // bytecodeDirPath: bytecode/hey
        let bytecodeDirPath = path.join(bytecodeBase, solDirPath);
        // make sure abi & bytecode dir paths exist
        helpers.makeDirP(abiDirPath);
        helpers.makeDirP(bytecodeDirPath);

        // abiFilePath: abi/hey/contract.abi
        let abiFilePath = path.join(abiDirPath, solFileNamePath) + ".abi";
        // bytecodeFilePath: bytecode/hey/contract.abi
        let bytecodeFilePath = path.join(bytecodeDirPath, solFileNamePath) + ".bytecode";
        
        let contract = contracts[solKey];
        let interface = contract.interface;
        let bytecode = contract.bytecode;
        await fs.writeFile(abiFilePath, interface, 'utf8');
        await fs.writeFile(bytecodeFilePath, bytecode, 'utf8');

        // add hashes
        let metadata = JSON.parse(contract.metadata);
        let solFileHash = metadata.sources[solFilePath].keccak256;
        let fullSolFilePath = path.join(solBase, solFilePath);
        hashes[fullSolFilePath] = solFileHash;
        
    }

    return hashes;

}