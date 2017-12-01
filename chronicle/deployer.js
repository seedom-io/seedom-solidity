const util = require('util');
const Web3 = require('web3');
const path = require('path');
const fs = require('mz/fs');
const h = require('./helper');
const compiler = require('./compiler');
const cli = require('./cli');
const networks = require('./networks');
const parity = require('./parity');

const iAmCompletelySure = "I AM COMPLETELY SURE";

const defaults = {
    gas: 1500000,
    gasPrice: 30000000000000
}

module.exports.main = async (state) => {
    
    // compile first
    state.compiler = await compiler.main({
        force: false
    });

    // now deploy
    cli.section("deployer");
    
    // if no network specified, default to test
    if (!state.networkName) {
        cli.info("'%s' network chosen as no network specified", h.testNetworkName);
        state.networkName = h.testNetworkName
    }

    state.contractConfig = await h.loadJsonFile(h.contractConfigFile);
    const contractHashes = await getContractHashes(state.contractConfig);
    const networkDeploymentFile = h.getDeploymentFile(state.networkName);
    state.networkDeployment = await getNetworkDeployment(networkDeploymentFile);

    const contractNames = state.force
        ? Object.keys(state.contractConfig)
        : await getLegacyContractNames(contractHashes, state.networkDeployment);
    
    // do deploy if we need to
    if (h.objLength(contractNames) == 0) {
        cli.success("everything is already deployed");
    } else {

        Object.assign(state, await deploy(
            contractNames,
            state.contractConfig,
            state.networkName,
            contractHashes
        ));

        // log deployment information to network file if we want to
        if (!state.forget) {
            logDeployments(state.deployments, state.networkDeployment);
            await h.writeJsonFile(networkDeploymentFile, state.networkDeployment);
            cli.success("deployments written");
        }

    }

    return state;

}

const getContractHashes = async (contractConfig) => {
    
    const contractHashes = {};
    for (let contractName in contractConfig) {
        const contractHash = await h.getContractHash(contractName);
        contractHashes[contractName] = contractHash;
    }

    return contractHashes;

}


const getNetworkDeployment = async (networkDeploymentFile) => {
    try {
        return await h.loadJsonFile(networkDeploymentFile);
    } catch (error) {
        return {};
    }
}

const getLegacyContractNames = async (contractHashes, networkDeployment) => {

    const legacyContractNames = [];

    for (let contractName in contractHashes) {

        const contractHash = contractHashes[contractName];
        const latestDeployment = this.getLatestDeployment(contractName, networkDeployment);
        if (latestDeployment && (latestDeployment.hash == contractHash)) {
            continue;
        }

        cli.info("'%s' needs to be upgraded", contractName);
        legacyContractNames.push(contractName);

    }

    return legacyContractNames;

}

module.exports.getLatestDeployment = (contractName, networkDeployment) => {

    if (!(contractName in networkDeployment)) {
        return null;
    }

    const deployments = networkDeployment[contractName];
    if (deployments.length == 0) {
        return null;
    }

    return deployments[0];

}

const deploy = async (
    contractNames,
    contractConfig,
    networkName,
    contractHashes,
    networkDeployment
) => {

    let state;
    // get base state
    if (networkName == h.testNetworkName) {
        state = await getParityState();
    } else {
        state = await getNetworkState(networkName);
    }

    if (!state) {
        return null;
    }

    // ask user for verification (optional)
    if (state.network.verify) {
        const question = "verification required!";
        if (!(await cli.question(question, iAmCompletelySure))) {
            cli.success("deployment aborted");
            return null;
        }
    }

    // save deployment account in state
    state.fromAddress = state.accountAddresses[0];

    state.deployments = {};
    state.deploymentPlans = {};
    state.instances = {};
    // deploy contracts one at a time
    for (let contractName of contractNames) {
        
        // deploy contract
        const result = await deployFromConfig(
            contractName,
            contractConfig,
            state.fromAddress,
            state.network,
            state.web3
        );

        // save deployments
        state.deployments[contractName] = {
            deployed: h.timestamp(),
            address: result.instance.options.address,
            hash: contractHashes[contractName]
        }

        // save deployment plans
        state.deploymentPlans[contractName] = result.deploymentPlan;
        // save web3 instances
        state.instances[contractName] = result.instance;

    }

    // done
    cli.success("deployment complete");

    return state;

}

const getParityState = async () => {
    
    const state = {};

    state.parity = await parity.main({
        fresh: false
    });

    state.network = state.parity.network;
    state.web3 = state.parity.web3;
    state.accountAddresses = state.parity.accountAddresses;

    cli.section("deployer");

    return state;

}

const getNetworkState = async (networkName) => {

    const state = {};

    // load configs and parameters
    const networkConfig = await h.loadJsonFile(h.networkConfigFile);
    state.network = networks.get(networkName, networkConfig);

    // get web3 instance
    state.web3 = await networks.getWeb3(state.network);
    if (!state.web3) {
        return null;
    }

    state.accountAddresses = await state.web3.eth.getAccounts();
    if (state.accountAddresses.length == 0) {
        cli.error("'%s' network contains no accounts", networkName);
        return null;
    }

    return state;

}

module.exports.again = async (deploymentPlans, web3) => {

    const instances = {};
    
    for (let contractName in deploymentPlans) {
        const deploymentPlan = deploymentPlans[contractName];
        const instance = await deployFromPlan(deploymentPlan, web3);
        instances[contractName] = instance;
    }

    return instances;

}

const deployFromConfig = async (
    contractName,
    contractConfig,
    fromAddress,
    network,
    web3
) => {

    // make sure we have an understanding of this contract
    if (!(contractName in contractConfig)) {
        cli.error("'%s' contract not found in contract config", contractName);
        return null;
    }

    const contract = contractConfig[contractName];
    const abiFile = h.getAbiFile(contractName);
    const bytecodeFile = h.getBytecodeFile(contractName);

    const deploymentPlan = {
        args: contract.args,
        fromAddress: fromAddress,
        abi: await h.loadJsonFile(abiFile),
        bytecode: await h.readFile(bytecodeFile),
        gas: getDeploymentPlanProperty('gas', contract, network),
        gasPrice: getDeploymentPlanProperty('gasPrice', contract, network)
    };

    const instance = await deployFromPlan(deploymentPlan, web3);
    const instanceAddress = instance.options.address;
    cli.success("'%s' contract deployed to %s", contractName, instanceAddress);

    return {
        instance: instance,
        deploymentPlan: deploymentPlan
    };

}

const getDeploymentPlanProperty = (property, contract, network) => {

    if (property in contract) {
        return contract[property];
    }

    if (property in network) {
        return network[property];
    }

    if (property in defaults) {
        return defaults[property];
    }

}

const deployFromPlan = async (deploymentPlan, web3) => {

    const contract = new web3.eth.Contract(deploymentPlan.abi);

    const transaction = contract.deploy({
        data: deploymentPlan.bytecode,
        arguments: deploymentPlan.args
    });

    const instance = await transaction.send({
        from: deploymentPlan.fromAddress,
        gas: deploymentPlan.gas,
        gasPrice: deploymentPlan.gasPrice
    });

    return instance;

}

const logDeployments = (deployments, networkDeployment) => {

    for (let contractName in deployments) {

        if (!(contractName in networkDeployment)) {
            networkDeployment[contractName] = [];
        }

        const deployment = deployments[contractName];
        networkDeployment[contractName].unshift(deployment);

    }

}