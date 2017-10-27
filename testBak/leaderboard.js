var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var assert = chai.assert;
var helpers = require('../helpers');
var mochaLogger = require('mocha-logger');

module.exports = (artifact, accounts) => {
  it("should return a leaderboard of N participants", async () => {

  });

  describe("when there 5 participants but 10 are requested", () => {
    it("should only return 5 participants", async () => {

    });
  })
};
