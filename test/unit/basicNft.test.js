const { ethers, deployments, network } = require("hardhat");
const { assert } = require("chai");
const { developmentChains } = require("../../helper-hardhat-config");

// Only run if we are on main net or test net
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Baisc NFT", function () {
      let basicNft, deployer;

      // Before running tests, make sure that the contract has been deployed.
      beforeEach(async function () {
        let accounts = await ethers.getSigners();
        deployer = accounts[0];
        await deployments.fixture(["basicNft"]);
        basicNft = await ethers.getContract("BasicNft", deployer);
      });

      describe("constructor", function () {
        it("Iniitializes the NFT correctly", async function () {
          const name = await basicNft.name();
          const symbol = await basicNft.symbol();
          const tokenCounter = await basicNft.getTokenCounter();
          assert.equal(name, "Dogie");
          assert.equal(symbol, "DOG");
          assert.equal(tokenCounter.toString(), "0");
        });
      });

      describe("Mint NFT", function () {
        it("Allows user to mint an NFT, and updates appropriately", async function () {
          const txResponse = await basicNft.mintNft();
          await txResponse.wait(1);
          const tokenURI = await basicNft.tokenURI(0);
          const TOKEN_URI = await basicNft.TOKEN_URI();
          const tokenCounter = await basicNft.getTokenCounter();
          // console.log({ tokenURI, TOKEN_URI });
          assert.equal(tokenCounter.toString(), "1");
          assert.equal(tokenURI, TOKEN_URI);
        });
      });
    });
