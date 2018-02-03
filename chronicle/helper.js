const dir = require('node-dir');
const util = require('util');
const path = require('path');
const fs = require('mz/fs');
const keccak256 = require('js-sha3').keccak256;
const chrono = require('chrono-node');

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
module.exports.hashDir = 'hash';
module.exports.outputDir = 'output';
module.exports.networkDir = 'network';
module.exports.interfaceDir = 'interface';

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

module.exports.getSolFile = (name) => {
    return path.join(this.contractDir, name) + '.' + this.solExt;
}

module.exports.getHashFile = (name) => {
    return path.join(this.hashDir, name) + '.' + this.hashExt;
}

module.exports.getOutputFile = (hash) => {
    return path.join(this.outputDir, hash) + '.' + this.jsonExt;
}

module.exports.getDeploymentFile = (name) => {
    return path.join(this.deploymentDir, name + '.' + this.jsonExt);
}

module.exports.getNetworkFile = (name) => {
    return path.join(this.networkDir, name + '.' + this.jsonExt);
}

module.exports.readSol = async (name) => {
    return this.readFile(this.getSolFile(name));
}

module.exports.readHash = async (name) => {
    return this.readFile(this.getHashFile(name));
}

module.exports.readOutput = async (hash) => {
    return this.readJsonFile(this.getOutputFile(hash));
}

module.exports.readDeployment = async (name) => {
    const deployment = this.readJsonFile(this.getDeploymentFile(name));
    if (!deployment) {
        return {
            addresses: {}
        };
    }
}

module.exports.readNetwork = async (name) => {
    return this.readJsonFile(this.getNetworkFile(name));
}

module.exports.writeHash = async (name, hash) => {
    return this.writeFile(this.getHashFile(name), hash);
}

module.exports.writeOutput = async (hash, output) => {
    return this.writeJsonFile(this.getOutputFile(hash), output);
}

module.exports.writeDeployment = async (name, deployment) => {
    return this.writeJsonFile(this.getDeploymentFile(name), deployment);
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

module.exports.sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.calculateHash = (data) => {
    var hasher = new keccak256.create(256);
    for (let datum of data) {
        hasher.update(datum);
    }
    return hasher.hex();
};

module.exports.arrayArgs = (methodArgs, contractArgs) => {
    const arrayArgs = [];
    for (let contractArg of contractArgs) {
        arrayArgs.push(methodArgs[contractArg]);
    }
    return arrayArgs;
};