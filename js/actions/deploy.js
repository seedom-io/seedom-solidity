const dir = require('node-dir');
const util = require('util');
const Web3 = require('web3');
const path = require("path");
const fs = require('mz/fs');
const readline = require('mz/readline');
const h = require('../helpers');

const defaultNetworkName = 'local';
const iAmCompletelySure = 'I AM COMPLETELY SURE';

const defaultConfig = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports = async (networkName) => {

    console.log('deploying contracts...');

    // if we have no env, test for local
    if (!networkName) {
        console.log('no network specified, defaulting to ' + defaultNetworkName);
        networkName = defaultNetworkName;
    }
    const contractsConfig = await h.loadJsonFile(h.contractsConfigPath);
    const deploymentsPath = h.getDeploymentsPath(networkName);
    const deployments = await h.loadJsonFile(deploymentsPath);
    const networksConfig = await h.loadJsonFile(h.networksConfigPath);
    const networkConfig = networksConfig[networkName];

    const upgrades = await getUpgrades(contractsConfig, deployments);
    if (Object.keys(upgrades).length == 0) {
        console.log('everything is up to date');
        return;
    }

    if (networkConfig.verify) {
        if (!(await verify(networkName))) {
            return;
        }
    }

    const web3 = await getWeb3(networkName, networkConfig);
    if (!web3) {
        return;
    }

    const upgradeDeployments = await deploy(upgrades, networkConfig, web3);

    await logUpgradeDeployments(upgradeDeployments, deployments, deploymentsPath);

    console.log('deployment upgrades complete');

}

const getUpgrades = async (contractsConfig, deployments) => {

    const upgrades = {};

    for (let contractName in contractsConfig) {
        const contractConfig = contractsConfig[contractName];
        const hash = await h.getHash(contractName);

        let lastDeployed;
        if (contractName in deployments) {
            const contractDeployments = deployments[contractName];
            if (contractDeployments.length > 0) {
                // get the latest deployment, verify hash
                const latestContractDeployment = contractDeployments[0];
                lastDeployed = latestContractDeployment.deployed;
                if (latestContractDeployment.hash == hash) {
                    continue;
                }
            }
        }

        console.log('legacy contract ' + contractName + ' last deployed on ' + lastDeployed);
        upgrades[contractName] = {
            config: contractConfig,
            lastDeployed: lastDeployed,
            hash: hash
        };

    }

    return upgrades;

}

const getWeb3 = async (networkName, networkConfig) => {

    console.log('detecting ' + networkName + ' network...');

    const web3 = createWeb3(networkConfig);
    if (await testWeb3(web3)) {
        console.log('detected ' + networkName + ' network');
        return web3;
    }

    console.log('failed to detect ' + networkName + ' network, aborting');
    return null;

}

const verify = async (networkName) => {

    console.log('!!! deploying to ' + networkName + ' network !!!');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('type ' + iAmCompletelySure + ' if you are sure: ');
    rl.close();

    const sure = (answer === iAmCompletelySure);
    if (!sure) {
        console.log(networkName + ' network deployment aborted');
    }

    return sure;

}

let createWeb3 = (networkConfig) => {
    return new Web3(new Web3.providers.HttpProvider(networkConfig.url));
}

let testWeb3 = async (web3) => {
    try {
        return await web3.eth.net.isListening();
    } catch (error) {
        return false;
    }
}

const deploy = async (upgrades, networkConfig, web3) => {

    const upgradeDeployment = {};

    for (let contractName in upgrades) {

        const upgrade = upgrades[contractName];
        const contractConfig = upgrade.config;
        const abiPath = h.getAbiPath(contractName);
        const bytecodePath = h.getBytecodePath(contractName);
        const abi = await h.loadJsonFile(abiPath);
        const bytecode = await h.readFile(bytecodePath);
        const contract = new web3.eth.Contract(abi);

        const transaction = contract.deploy({
            data: '0x' + bytecode,
            arguments: contractConfig.args
        });

        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        const gas = getProperty('gas', contractConfig, networkConfig);
        const gasPrice = getProperty('gasPrice', contractConfig, networkConfig);

        const result = await transaction.send({
            from: account,
            gas: gas,
            gasPrice: gasPrice
        }).on('error', (error) => {
            console.log('error: ' + error);
        }).on('receipt', (receipt) => {
            console.log('receipt: ' + receipt.contractAddress); // contains the new contract address
        }).on('confirmation', function (confirmationNumber, receipt) {
            console.log('confirmation: ' + confirmationNumber);
        });

        upgradeDeployment[contractName] = {
            result: result,
            deployed: h.now(),
            hash: upgrade.hash
        };

    }

    return upgradeDeployment;

}

const getProperty = (property, contractConfig, networkConfig) => {

    if (property in contractConfig) {
        return contractConfig[property];
    }

    if (property in networkConfig) {
        return networkConfig[property];
    }

    if (property in defaultConfig) {
        return defaultConfig[property];
    }

}

const logUpgradeDeployments = (upgradeDeployments, deployments, deploymentsPath) => {

    for (let contractName in upgradeDeployments) {

        let upgradeDeployment = upgradeDeployments[contractName];

        if (!(contractName in deployments)) {
            deployments[contractName] = [];
        }

        const deployment = {
            deployed: upgradeDeployment.deployed,
            hash: upgradeDeployment.hash,
            address: upgradeDeployment.result.contractAddress
        }

        deployments[contractName].unshift(deployment);

    }

    h.writeJsonFile(deployments, deploymentsPath);

}