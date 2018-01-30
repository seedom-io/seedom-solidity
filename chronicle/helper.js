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

module.exports.testDir = 'test';
module.exports.contractDir = 'contract';
module.exports.deploymentDir = 'deployment';
module.exports.parityDir = 'parity';
module.exports.stageDir = 'stage';
module.exports.abiDir = 'abi';
module.exports.bytecodeDir = 'bytecode';
module.exports.networkDir = 'network';

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

module.exports.localNetworkName = 'localhost';

module.exports.printKeys = (obj) => {
    for (let key in obj) {
        console.log(key);
    }
}

module.exports.readJsonFile = async (file) => {
    const json = await this.readFile(file);
    return JSON.parse(json);
}

module.exports.writeJsonFile = async (file, obj) => {
    await this.writeFile(file, JSON.stringify(obj, null, 4));
}

module.exports.getSolFile = (contractName) => {
    return path.join(this.contractDir, contractName) + '.' + this.solExt;
}

module.exports.getAbiFile = (contractName) => {
    return path.join(this.abiDir, contractName) + '.' + this.jsonExt;
}

module.exports.getBytecodeFile = (contractName) => {
    return path.join(this.bytecodeDir, contractName) + '.' + this.bytecodeExt;
}

module.exports.getDeploymentFile = (networkName) => {
    return path.join(this.deploymentDir, networkName + '.' + this.jsonExt);
}

module.exports.getNetworkFile = (networkName) => {
    return path.join(this.networkDir, networkName + '.' + this.jsonExt);
}

module.exports.readSol = async (contractName) => {
    return this.readFile(this.getSolFile(contractName));
}

module.exports.readAbi = async (contractName) => {
    return this.readJsonFile(this.getAbiFile(contractName));
}

module.exports.readBytecode = async (contractName) => {
    return this.readFile(this.getBytecodeFile(contractName));
}

module.exports.readHash = async (contractName) => {
    return this.readFile(this.getHashFile(contractName));
}

module.exports.readDeployment = async (networkName) => {
    return this.readJsonFile(this.getDeploymentFile(networkName));
}

module.exports.readNetwork = async (networkName) => {
    return this.readJsonFile(this.getNetworkFile(networkName));
}

module.exports.writeAbi = async (contractName, abi) => {
    return this.writeJsonFile(this.getAbiFile(contractName), abi);
}

module.exports.writeBytecode = async (contractName, bytecode) => {
    return this.writeFile(this.getBytecodeFile(contractName), bytecode);
}

module.exports.writeHash = async (contractName, hash) => {
    return this.writeFile(this.getHashFile(contractName), hash);
}

module.exports.writeDeployment = async (networkName, deployment) => {
    return this.writeFile(this.getDeploymentFile(networkName), deployment);
}

module.exports.readFile = async (file) => {

    try {
        await fs.access(file)
    } catch (error) {
        return null;
    }

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