const dir = require('node-dir');
const util = require('util');
const path = require("path");
const fs = require('mz/fs');
var keccak256 = require('js-sha3').keccak256;

const defaultEncoding = 'utf8';

module.exports.contractExt = 'sol';
module.exports.jsonExt = 'json';
module.exports.bytecodeExt = 'bytecode';
module.exports.hashExt = 'hash';

module.exports.contractsBase = 'contracts';
module.exports.abiBase = 'abi';
module.exports.bytecodeBase = 'bytecode';
module.exports.configBase = 'config';
module.exports.deploymentsBase = 'deployments';
module.exports.hashBase = 'hash';

module.exports.networksConfigPath = path.join(this.configBase, 'networks.' + this.jsonExt);
module.exports.contractsConfigPath = path.join(this.configBase, 'contracts.' + this.jsonExt);

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

module.exports.getContractPath = (contractName) => {
    return path.join(this.contractsBase, contractName) + '.' + this.contractExt;
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

module.exports.calculateHash = async (filePath) => {
    const data = await this.readFile(filePath);
    var hasher = new keccak256.create(256);
    hasher.update(data);
    return "0x" + hasher.hex();
}

module.exports.getHash = async (contractName) => {
    const hashPath = this.getHashPath(contractName);
    return await this.readFile(hashPath);
}

module.exports.now = () => {
    return Math.round((new Date()).getTime() / 1000);
}

module.exports.objLength = (obj) => {
    return Object.keys(obj).length;
}