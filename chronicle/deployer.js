const util = require('util');
const Web3 = require('web3');
const path = require('path');
const fs = require('mz/fs');
const readline = require('mz/readline');
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

module.exports.all = async (networkName, force, forget, persist) => {
    
    const state = {};
    
    // compile first
    state.compiler = await compiler();

    // now deploy
    cli.section("deploy");
    
    // if no network specified, default to test
    if (!networkName) {
        cli.info("'%s' network chosen as no network specified", h.testNetworkName);
        networkName = h.testNetworkName
    }

    state.networkName = networkName;
    const contractConfig = await h.loadJsonFile(h.contractConfigFile);
    state.contractHashes = await getContractHashes(contractConfig);
    const networkDeploymentFile = h.getDeploymentFile(networkName);
    const networkDeployment = await getNetworkDeployment(networkDeploymentFile);

    const contractNames = force
        ? Object.keys(contractConfig)
        : await getLegacyContractNames(state.contractHashes, networkDeployment);
    
    // do deploy if we need to
    if (h.objLength(contractNames) == 0) {
        cli.success("everything is already deployed");
    } else {
        Object.assign(state, await deploy(
            contractNames,
            contractConfig,
            networkName,
            state.contractHashes,
            forget ? null : networkDeployment
        ));
    }

    // shut down?
    if (!persist) {
        if (state.parity) {
            state.parity.execution.process.kill();
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
        return {
            file: networkDeploymentFile,
            deployments: await h.loadJsonFile(networkDeploymentFile)
        }
    } catch (error) {
        return {};
    }
}

const getLegacyContractNames = async (contractHashes, networkDeployment) => {

    const legacyContractNames = [];

    for (let contractName in contractHashes) {

        const contractHash = contractHashes[contractName];
        const latestDeployment = getLatestDeployment(contractName, networkDeployment);
        if (latestDeployment && (latestDeployment.hash == contractHash)) {
            continue;
        }

        cli.info("'%s' needs to be upgraded", contractName);
        legacyContractNames.push(contractName);

    }

    return legacyContractNames;

}

const getLatestDeployment = (contractName, networkDeployment) => {

    if (!(contractName in networkDeployment.deployments)) {
        return null;
    }

    const deployments = networkDeployment.deployments[contractName];
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
        cli.section("deploy");
    } else {
        state = await getNetworkState(networkName);
    }

    if (!state) {
        return null;
    }

    // ask user for verification (optional)
    if (state.network.verify) {
        cli.important("'%s' network requires verification", networkName);
        if (!(await verify(networkName))) {
            cli.success("deployment aborted");
            return null;
        }
    }

    // save deployment account in state
    state.fromAddress = state.accountAddresses[0];

    state.deployments = {};
    state.deploymentPlans = {};
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
            deployed: h.now(),
            address: result.web3Instance.options.address,
            hash: contractHashes[contractName]
        }

        // save deployment plans
        state.deploymentPlans[contractName] = result.deploymentPlan;

    }

    // if we have a deployment, save it all, else forget
    if (networkDeployment) {
        logDeployments(state.deployments, networkDeployment);
        await h.writeJsonFile(networkDeployment.file, networkDeployment.deployments);
        cli.success("deployments written");
    }

    // done
    cli.success("deployment complete");

    return state;

}

const getParityState = async () => {
    
    const state = {};

    state.parity = await parity.start(false, true);
    state.network = state.parity.network;
    state.web3 = state.parity.web3;
    state.accountAddresses = state.parity.accountAddresses;

    return state;

}

const getNetworkState = async (networkName) => {

    const state = {};

    // load configs and parameters
    const networkConfig = await h.loadJsonFile(h.networkConfigFile);
    state.network = networks.get(networkName, networkConfig);

    // get web3 instance
    state.web3 = await networks.getWeb3(networkParams);
    if (!web3) {
        return null;
    }

    state.accountAddresses = await web3.eth.getAccounts();
    if (accounts.length == 0) {
        cli.error("'%s' network contains no accounts", networkName);
        return null;
    }

    return state;

}

const verify = async () => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("type " + iAmCompletelySure + " if you are sure: ");
    rl.close();
    return (answer === iAmCompletelySure);
}

module.exports.again = async (deploymentPlans, web3) => {

    const web3Instances = {};
    
    for (let contractName in deploymentPlans) {
        const deploymentPlan = deploymentPlans[contractName];
        const web3Instance = await deployFromPlan(deploymentPlan, web3);
        web3Instances[contractName] = web3Instance;
    }

    return web3Instances;

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

    const web3Instance = await deployFromPlan(deploymentPlan, web3);
    const contractAddress = web3Instance.options.address;
    cli.success("'%s' contract deployed to %s", contractName, contractAddress);

    return {
        web3Instance: web3Instance,
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

    const web3Contract = new web3.eth.Contract(deploymentPlan.abi);

    const web3Transaction = web3Contract.deploy({
        data: deploymentPlan.bytecode,
        arguments: deploymentPlan.args
    });

    const web3Instance = await web3Transaction.send({
        from: deploymentPlan.fromAddress,
        gas: deploymentPlan.gas,
        gasPrice: deploymentPlan.gasPrice
    });

    return web3Instance;

}

const logDeployments = (deployments, networkDeployment) => {

    if (!('deployments' in networkDeployment)) {
        networkDeployment.deployments = {};
    }

    for (let contractName in deployments) {

        if (!(contractName in networkDeployment.deployments)) {
            networkDeployment.deployments[contractName] = [];
        }

        const deployment = deployments[contractName];
        networkDeployment.deployments[contractName].unshift(deployment);

    }

}