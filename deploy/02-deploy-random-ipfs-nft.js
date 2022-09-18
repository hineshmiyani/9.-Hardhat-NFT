const { network, ethers } = require("hardhat");
const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const {
  storeImages,
  storeTokenUriMetadata,
} = require("../utils/uploadToPinata");
require("dotenv").config();

const imagesLocation = "./images/randomNft";

const metadataTemplate = {
  name: "",
  description: "",
  image: "",
  attributes: [
    {
      trait_type: "Cuteness",
      value: 100,
    },
  ],
};

let tokenUris = [
  "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo",
  "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d",
  "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm",
];

const FUND_AMOUNT = ethers.utils.parseEther("10.0"); //  10 eth => 10**19

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  // Get the IPFS hashes of our images by this methods:
  // 1. With our own IPFS node. https://docs.ipfs.io/
  // 2. Pinata https://www.pinata.cloud/   // ✅ We will use Pinata
  // 3. NFT.storage https://nft.storage/

  if (process.env.UPLOAD_TO_PINATA == "true") {
    tokenUris = await handleTokenUris();
  }

  let vrfCoordinatorV2Address, subscriptionId;
  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const tx = await vrfCoordinatorV2Mock.createSubscription();
    const txReceipt = await tx.wait(1);
    subscriptionId = txReceipt.events[0].args.subId;

    // Fund subscription:
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }

  log("--------------------------");

  const args = [
    vrfCoordinatorV2Address,
    subscriptionId,
    networkConfig[chainId]["gasLane"],
    networkConfig[chainId]["callbackGasLimit"],
    tokenUris,
    networkConfig[chainId]["mintFee"],
  ];

  log("RandomIpfsNft Deploying....");

  const randomIpfsNft = await deploy("RandomIpfsNft", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  log("RandomIpfsNft Deployed....");
  log("--------------------------");

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(randomIpfsNft.address, args);
  }
};

async function handleTokenUris() {
  let tokenUris = [];
  // store the images in IPFS
  // store the metadata  in IPFS
  const { responses: imageUploadResponses, files } = await storeImages(
    imagesLocation
  );
  for (imageUploadResponseIndex in imageUploadResponses) {
    // create metaadat
    // upload the metadata
    let tokenUriMetadata = { ...metadataTemplate };

    //  Here, files = [pub.png, st-bernard.png, shiba-inu.png] 👇👇
    tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "");
    tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`;
    tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
    console.log(`Uploading ${tokenUriMetadata.name}`);

    // store the JSON to pinata/ IPFS
    const metadataUploadResponse = await storeTokenUriMetadata(
      tokenUriMetadata
    );
    tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`);
  }
  console.log("Token URIS Uploaded ! : ", tokenUris);
  return tokenUris;
}

module.exports.tags = ["all", "randomIpfs", "main"];
