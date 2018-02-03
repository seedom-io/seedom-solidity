const compile = require('./compile');
const h = require('./helper');
const cli = require('./cli');
const dir = require('node-dir');
const parsers = require('./parsers');
const path = require('path');
const network = require('./network');

module.exports.save = async (state) => {
    h.writeDeployment(state.networkName, state.deployment);
    cli.success("deployment written");
};

module.exports.main = async (state) => {

    // first network
    await network.main(state);

    // now interface
    cli.section("interface");

    // track deployments
    state.deployment = await h.readDeployment(state.networkName);

    // set up receipt catching
    state.receipts = {};

    // set up instances proxy
    state.instances = new Proxy({}, {
        get: async (target, name) => {
            return await resolveInstance(target, name, state);
        }
    });

    // check for a contract & method
    if (state.contractName && state.methodName) {
        // run command
        await this.save(state);
    }

};

const resolveInstance = async (instances, name, state) => {

    // if we have the instance, just return it
    if (name in instances) {
        return instances[name];
    }

    // if we have a contract name or address, look up the deployment
    const instance = await resolveStringInstance(name, state);
    instances[name] = instance;
    return instance;

};

const resolveStringInstance = async (name, state) => {

    // find the contract deets
    const {
        contractName,
        hash,
        address,
        transactionHash,
        isLatest
    } = resolveContractDetails(name, state);

    // make sure we have a hash and contract name
    if (!contractName || !hash) {
        return null;
    }

    let web3Instance;
    // check for latest
    if (!isLatest) {
        // attempt to find output
        const output = await h.readOutput(hash);
        if (!output) {
            return null;
        }

        // resurrect contract
        const contract = {
            name: contractName,
            hash: hash,
            ...output
        };

        state.contracts[hash] = contract;
        web3Instance = new state.web3.eth.Contract(contract.abi, address);
        state.receipts[release.transactionHash] = await state.web3.eth.getTransactionReceipt(transactionHash);

    } else {

        web3Instance = new state.web3.eth.Contract(contract.abi);

    }

    // get proxy instance
    return getInstance(web3Instance, contract, state);

};

const resolveContractDetails = (name, state) => {

    const result = {
        contractName: null,
        hash: null,
        address: null,
        transactionHash: null,
        isLatest: null
    };

    // find the proper hash
    if (name.startsWith('0x')) {

        // first find the contract name for this address
        if (!(name in state.deployment.addresses)) {
            return result;
        }
        
        result.isLatest = false;
        result.contractName = state.deployment.addresses[name];
        // get deployment
        deployment = state.deployments[contractName];
        // now search for the deployment
        for (let release of deployment) {
            if (release.address === address) {
                // copy release details to result
                Object.assign(result, release);
                break;
            }
        }

    } else {

        result.isLatest = true;
        result.contractName = name;
        // get deployment
        deployment = state.deployments[name];
        // if no deployments, we are likely going to deploy
        if (deployment.length === 0) {
            // grab latest hash from contracts
            result.hash = state.contracts[contractName].hash;
            return result;
        }

        // copy release details to result
        Object.assign(result, deployment[0]);

    }

    return result;

}

const getInstance = (web3Instance, contract, state) => {

    let instance;
    // see if we have an interface for this instance
    const interface = state.interfaces[contract.name];
    // get an instance from the interface
    if (interface) {
        instance = interface(contract, web3Instance);
    }

    // create instance proxy
    return new Proxy(web3Instance, {
        get: async (target, name) => {
            return await resolveInstanceMethod(name, target, instance, contract, state);
        }
    });

};

const resolveInstanceMethod = async (methodName, web3Instance, instance, contract, state) => {

    // check for a method interface
    if (instance && (methodName in instance)) {

        const method = instance[methodName];
        // check for a method interface action
        if (typeof method === 'function') {
            return method;
        } else if (typeof method === 'object') {
            return method.action;
        }

    }

    // fall to web3 method
    return async (args, options) => {
        return await runWeb3Method(methodName, args, options, web3Instance, instance, contract, state);
    };

}

const runWeb3Method = async (methodName, args, options, web3Instance, instance, contract, state) => {

    if (methodName == 'deploy') {
            
        const web3Transaction = web3Instance.deploy({
            data: contract.bytecode,
            arguments: args
        });

        const web3Result = await network.sendMethod(web3Transaction, options, state);
        web3Result.instance.setProvider(state.web3.currentProvider);

        // save the receipt
        state.receipts[web3Result.receipt.transactionHash] = web3Result.receipt;

        const contractAddress = web3Result.instance.options.address;
        // save to addresses as well (for easy lookup)
        state.deployment.addresses[contractAddress] = contractName;
        // save deployment
        state.deployment[contractName].unshift({
            deployed: h.timestamp(),
            address: contractAddress,
            transactionHash: web3Result.receipt.transactionHash
        });

        cli.success("'%s' contract deployed to %s", contractName, contractAddress);
        // super weird, but because we have to return a proxy in a proxy to
        // override the parent proxy (trust me)
        return new Proxy(web3Result.instance, {
            get: async (target, name) => {
                return await resolveInstanceMethod(name, target, instance, contract, state);
            }
        })

    } else if (option.transact) {

        // transaction
        const web3Receipt = network.sendMethod(
            web3Instance[methodName].apply(args),
            options,
            state
        );

        // save & return receipt
        state.receipts[receipt.transactionHash] = web3Receipt;
        return web3Receipt;

    } else {

        // standard call
        return web3Instance[methodName].apply(args).call(options);

    }

}

module.exports.prepare = async (program, state) => {
    state.interfaces = await getInterfaces();
    prepareCommands(program, state);
};

const getInterfaces = async () => {

    const interfaces = [];
    const interfaceFiles = await getInterfaceFiles();
    for (let interfaceFile of interfaceFiles) {
        const relativeInterfaceFile = path.relative(h.interfaceDir, interfaceFile);
        const relativeInterfaceFileExtIndex = relativeInterfaceFile.indexOf('.' + h.jsExt);
        const interfaceName = relativeInterfaceFile.substr(0, relativeInterfaceFileExtIndex);
        const requireInterfaceFile = path.join('../', interfaceFile);
        const interface = require(requireInterfaceFile);
        interfaces[interfaceName] = interface;
    }

    return interfaces;

};

const getInterfaceFiles = async () => {
    const interfaceFiles = await dir.promiseFiles(h.interfaceDir);
    return interfaceFiles.filter(file => path.extname(file) == '.' + h.jsExt);
};

const prepareCommands = (program, state) => {
    for (let contractName in state.contracts) {
        const contract = state.contracts[contractName];
        const interface = state.interfaces[contractName];
        prepareCommand(program, contract, interface, state)
    }
};

const prepareCommand = (program, contract, interface, state) => {

    for (let methodName in contract.methods) {

        // set up command
        const command = program
            .command(contract.name + ':' + methodName  + ' [network]')
            .option('__from', 'from address')
            .option('__to', 'contract address')
            .option('__value', 'value')
            .option('__gas', 'gas')
            .option('__gasPrice', 'gas price');

        // get args
        const args = contract.methods[methodName];
        // see if we have an interface for this command
        const method = interface[methodName];
        // get command options
        const optionNames = prepareCommandOptions(command, args, method);
        // prepare action
        command.action((network, options, commander) => {
            this.main(Object.assign(state, {
                networkName: network,
                contractName: contract.name,
                methodName,
                methodArgs: getMethodArgs(options, optionNames),
                methodOptions: getMethodOptions(options)
            }));
        });

    }

};

const prepareCommandOptions = (command, args, method) => {

    let optionNames = [];

    // add abi inputs
    for (let arg of args) {
        optionNames.push(arg);
        command.option(arg);
    }

    // add additional interface args
    if (method && ('args' in method)) {
        for (let arg of method.args) {
            // we support "name" and ["name", "description"]
            if (typeof arg === 'string') {
                optionNames.push(arg);
                command.option(arg);
            } else if (typeof arg === 'array') {
                optionNames.push(arg[0]);
                command.option(arg[0], arg[1]);
            }
        }
    }

    return optionNames;

}

const getMethodArgs = (options, optionNames) => {

    const args = {};
    // move arguments out
    for (let optionName of optionNames) {
        args[optionName] = options[optionName];
    }

    return args;

}

const getMethodOptions = (options) => {

    const methodOptions = {};

    if (options.__from) {
        methodOptions.from = options.__from;
    }

    if (options.__to) {
        methodOptions.from = options.__to;
    }

    if (options.__value) {
        methodOptions.from = options.__value;
    }

    if (options.__gas) {
        methodOptions.from = options.__gas;
    }

    if (options.__gasPrice) {
        methodOptions.from = options.__gasPrice;
    }

    return methodOptions;

}