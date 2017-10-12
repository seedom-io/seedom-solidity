module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      before_timeout: 0,
      test_timeout: 0,
      gasPrice: 100000000000
    }
  }
};