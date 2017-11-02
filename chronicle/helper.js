const dir = require('node-dir');
const util = require('util');
const path = require('path');
const fs = require('mz/fs');
const keccak256 = require('js-sha3').keccak256;

const defaultEncoding = 'utf8';

module.exports.solExt = 'sol';
module.exports.jsonExt = 'json';
module.exports.bytecodeExt = 'bytecode';
module.exports.hashExt = 'hash';
module.exports.jsExt = 'js';
module.exports.ipcExt = 'ipc';
module.exports.logExt = 'log';
module.exports.tomlExt = 'toml';
module.exports.passExt = 'pass';
module.exports.pidExt = 'pid';


module.exports.buildDir = 'build';
module.exports.testDir = 'test';
module.exports.configDir = 'config';
module.exports.contractDir = 'contract';
module.exports.deploymentDir = 'deployment';
module.exports.parityDir = 'parity';
module.exports.stageDir = 'stage';

module.exports.buildAbiDir = path.join(this.buildDir, 'abi');
module.exports.buildBytecodeDir = path.join(this.buildDir, 'bytecode');
module.exports.buildHashDir = path.join(this.buildDir, 'hash');

module.exports.parityDbDir = path.join(this.parityDir, 'chains');
module.exports.parityKeysDir = path.join(this.parityDir, 'keys');
module.exports.paritySignerDir = path.join(this.parityDir, 'signer');
module.exports.parityDappsDir = path.join(this.parityDir, 'dapps');
module.exports.paritySecretstoreDir = path.join(this.parityDir, 'secretstore');

module.exports.parityTomlFile = path.join(this.parityDir, 'parity.' + this.tomlExt);
module.exports.parityChainFile = path.join(this.parityDir, 'parity.' + this.jsonExt);
module.exports.parityIpcFile = path.join(this.parityDir, 'parity.' + this.ipcExt);
module.exports.parityLogFile = path.join(this.parityDir, 'parity.' + this.logExt);
module.exports.parityPasswordFile = path.join(this.parityDir, 'parity.' + this.passExt);
module.exports.paritySignerAuthCodesFile = path.join(this.paritySignerDir, 'authcodes');
module.exports.parityPidFile = path.join(this.parityDir, 'parity.' + this.pidExt);

module.exports.networkConfigFile = path.join(this.configDir, 'network.' + this.jsonExt);
module.exports.contractConfigFile = path.join(this.configDir, 'contract.' + this.jsonExt);
module.exports.parityConfigFile = path.join(this.configDir, 'parity.' + this.jsonExt);

module.exports.testNetworkName = 'test';

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
    const json = await this.readFile(file);
    return JSON.parse(json);
}

module.exports.writeJsonFile = async (file, obj) => {
    await this.writeFile(file, JSON.stringify(obj, null, 4));
}

module.exports.getContractFile = (contractName) => {
    return path.join(this.contractDir, contractName) + '.' + this.solExt;
}

module.exports.getAbiFile = (contractName) => {
    return path.join(this.buildAbiDir, contractName) + '.' + this.jsonExt;
}

module.exports.getBytecodeFile = (contractName) => {
    return path.join(this.buildBytecodeDir, contractName) + '.' + this.bytecodeExt;
}

module.exports.getHashFile = (contractName) => {
    return path.join(this.buildHashDir, contractName) + '.' + this.hashExt;
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

module.exports.timestamp = (date) => {

    if (!date) {
        date = new Date();
    }

    return Math.round(date.getTime() / 1000);
    
}

module.exports.isArray = (obj) => {
    return Array.isArray(obj);
}

module.exports.objLength = (obj) => {
    return Object.keys(obj).length;
}

module.exports.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.getContractHash = async (contractName) => {
    
    const hashFile = this.getHashFile(contractName);

    try {
        await fs.access(hashFile)
    } catch (error) {
        return null;
    }

    return await this.readFile(hashFile);

}

module.exports.calculateContractHash = async (contractName) => {
    const contractFile = this.getContractFile(contractName);
    const data = await this.readFile(contractFile);
    var hasher = new keccak256.create(256);
    hasher.update(data);
    return '0x' + hasher.hex();
}