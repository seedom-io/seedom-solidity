const dir = require('node-dir');
const util = require('util');
const path = require("path");
const fs = require('mz/fs');
var keccak256 = require('js-sha3').keccak256;

const defaultEncoding = 'utf8';

module.exports.solExt = 'sol';
module.exports.jsonExt = 'json';
module.exports.bytecodeExt = 'bytecode';
module.exports.hashExt = 'hash';
module.exports.jsExt = 'js';

module.exports.buildDir = 'build';
module.exports.configDir = 'config';
module.exports.contractDir = 'contract';
module.exports.deploymentDir = 'deployment';
module.exports.testDir = 'test';

module.exports.abiDir = path.join(this.buildDir, 'abi');
module.exports.bytecodeDir = path.join(this.buildDir, 'bytecode');
module.exports.hashDir = path.join(this.buildDir, 'hash');

module.exports.networkConfigFile = path.join(this.configDir, 'network.' + this.jsonExt);
module.exports.contractConfigFile = path.join(this.configDir, 'contract.' + this.jsonExt);
module.exports.simulatorConfigFile = path.join(this.configDir, 'simulator.' + this.jsonExt);

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

module.exports.loadJsonFile = async (file) => {

    try {
        const json = await fs.readFile(file);
        return JSON.parse(json);
    } catch (error) {
        return {};
    } 
    
}

module.exports.writeJsonFile = async (obj, file) => {
    await this.writeFile(file, JSON.stringify(obj, null, 4));
}

module.exports.getContractFile = (contractName) => {
    return path.join(this.contractDir, contractName) + '.' + this.solExt;
}

module.exports.getAbiFile = (contractName) => {
    return path.join(this.abiDir, contractName) + '.' + this.jsonExt;
}

module.exports.getBytecodeFile = (contractName) => {
    return path.join(this.bytecodeDir, contractName) + '.' + this.bytecodeExt;
}

module.exports.getHashFile = (contractName) => {
    return path.join(this.hashDir, contractName) + '.' + this.hashExt;
}

module.exports.getDeploymentFile = (networkName) => {
    return path.join(this.deploymentDir, networkName + '.' + this.jsonExt);
}

module.exports.readFile = async (file) => {
    return await fs.readFile(file, defaultEncoding);
}

module.exports.writeFile = async (file, data) => {
    await fs.writeFile(file, data, defaultEncoding);
}

module.exports.calculateHash = async (file) => {
    const data = await this.readFile(file);
    var hasher = new keccak256.create(256);
    hasher.update(data);
    return "0x" + hasher.hex();
}

module.exports.getHash = async (contractName) => {

    const hashFile = this.getHashFile(contractName);
    if (!await fs.exists(hashFile)) {
        return null;
    }

    return await this.readFile(hashFile);

}

module.exports.now = () => {
    return Math.round((new Date()).getTime() / 1000);
}

module.exports.objLength = (obj) => {
    return Object.keys(obj).length;
}