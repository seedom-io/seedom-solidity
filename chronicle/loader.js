const fs = require('fs');
const path = require('path');
const dir = require('node-dir');

const LOCALHOST_RPC_URL = 'http://localhost:8545';
const LOCALHOST_WS_URL = 'ws://localhost:8546';
const MAX_CONTRACTS_PER_NAME = 6;

module.exports.getNetworks = () => {
  const networkPath = path.resolve(__dirname, '../network');
  const networkFiles
    = (dir.files(networkPath, { sync: true })).filter(file => path.extname(file) === '.json');

  const networks = {};
  for (const networkFile of networkFiles) {
    const networkName = path.basename(networkFile, '.json');
    const networkData = fs.readFileSync(networkFile);
    const network = JSON.parse(networkData);
    // check for proxy url, then standard url, then default to localhost
    networks[networkName] = {
        rpcUrl: network.rpcUrl ? network.rpcUrl : LOCALHOST_RPC_URL,
        wsUrl: network.wsUrl ? network.wsUrl : LOCALHOST_WS_URL
    };
  }

  return networks;
};

module.exports.getDeployments = () => {
  const deploymentPath = path.resolve(__dirname, '../deployment');
  const deploymentFiles
    = (dir.files(deploymentPath, { sync: true })).filter(file => path.extname(file) === '.json');

  const contracts = {};
  const outputs = {};
  for (const deploymentFile of deploymentFiles) {
    const networkName = path.basename(deploymentFile, '.json');
    contracts[networkName] = {};

    const deploymentData = fs.readFileSync(deploymentFile);
    const deployment = JSON.parse(deploymentData);
    for (const contractName in deployment.releases) {
      contracts[networkName][contractName] = [];

      const releases = deployment.releases[contractName].slice(0, MAX_CONTRACTS_PER_NAME);
      for (const release of releases) {
        let output;
        // grab and cache outputs
        if (release.hash in outputs) {
          output = outputs[release.hash];
        } else {
          const outputFile = path.resolve(__dirname, `../output/${release.hash}.json`);
          const outputData = fs.readFileSync(outputFile);
          output = JSON.parse(outputData);
          outputs[release.hash] = output;
        }

        contracts[networkName][contractName].push({
          address: release.address,
          abi: output.abi
        });
      }
    }
  }

  return contracts;
};
