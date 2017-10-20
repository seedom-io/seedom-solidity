const dir = require('node-dir');
const util = require('util');
const path = require("path");
const fs = require('mz/fs');

const defaultEncoding = 'utf8';

module.exports.solExt = 'sol';
module.exports.jsonExt = 'json';
module.exports.bytecodeExt = 'bytecode';
module.exports.hashExt = 'hash';

module.exports.solBase = 'sol';
module.exports.abiBase = 'abi';
module.exports.bytecodeBase = 'bytecode';
module.exports.configBase = 'config';
module.exports.deploymentsBase = 'deployments';
module.exports.hashBase = 'hash';

module.exports.networksConfigPath = path.join(this.configBase, 'networks.' + this.jsonExt);
module.exports.contractsConfigPath = path.join(this.configBase, 'contracts.' + this.jsonExt);

module.exports.getFilesOfExt = async (dirPath, ext) => {
    const files = await dir.promiseFiles(dirPath);
    return files.filter(file => path.extname(file) == '.' + ext);
}

module.exports.printLines = (lines) => {
    for (let line of lines) {
        console.log(line);
    }
}

module.exports.printKeys = (obj) => {
    for (let key in obj) {
        console.log(key);
    }
}

module.exports.loadJsonFile = async (filePath) => {
    const json = await fs.readFile(filePath);
    return JSON.parse(json);
}

module.exports.writeJsonFile = async (obj, filePath) => {
    await this.writeFile(filePath, JSON.stringify(obj, null, 4));
}

module.exports.getAbiPath = (contractName) => {
    return path.join(this.abiBase, contractName) + '.' + this.jsonExt;
}

module.exports.getBytecodePath = (contractName) => {
    return path.join(this.bytecodeBase, contractName) + '.' + this.bytecodeExt;
}

module.exports.getHashPath = (contractName) => {
    return path.join(this.hashBase, contractName) + '.' + this.hashExt;
}

module.exports.getDeploymentsPath = (networkName) => {
    return path.join(this.deploymentsBase, networkName + '.' + this.jsonExt);
}

module.exports.readFile = async (filePath) => {
    return await fs.readFile(filePath, defaultEncoding);
}

module.exports.writeFile = async (filePath, data) => {
    await fs.writeFile(filePath, data, defaultEncoding);
}

module.exports.getHash = async (contractName) => {
    const hashPath = this.getHashPath(contractName);
    return await this.readFile(hashPath);
}

module.exports.now = function () {
    return Math.round((new Date()).getTime() / 1000);
}