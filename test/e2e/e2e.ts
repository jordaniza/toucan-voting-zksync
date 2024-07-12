import { expect } from "chai";
import { Contract } from "ethers";
import * as ethers from "ethers";

import { Options } from "@layerzerolabs/lz-v2-utilities";
import { LOCAL_RICH_WALLETS, deployContract, getWallet } from "../../deploy/utils";
import { Wallet } from "zksync-ethers";

import { EndpointV2, EndpointV2Mock, MyOFT, OFT, OFTMock } from "../../typechain";

describe("MyOFT Test", function () {
  // Constant representing a mock Endpoint ID for testing purposes
  const eidA = 1;
  const eidB = 2;
  // Declaration of variables to be used in the test suite
  let ownerA: Wallet;
  let ownerB: Wallet;
  let endpointOwner: Wallet;
  let myOFTA: OFTMock;
  let myOFTB: OFTMock;
  let mockEndpointA: EndpointV2Mock;
  let mockEndpointB: EndpointV2Mock;

  // Before hook for setup that runs once before all tests in the block
  before(async function () {
    // Contract factory for our tested contract

    // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
    const signers = LOCAL_RICH_WALLETS.map(({ privateKey }) => getWallet(privateKey));

    ownerA = signers[0];
    ownerB = signers[1];
    endpointOwner = signers[2];

    // The EndpointV2Mock contract comes from @layerzerolabs/test-devtools-evm-hardhat package
    // and its artifacts are connected as external artifacts to this project
    //
    // Unfortunately, hardhat itself does not yet provide a way of connecting external artifacts
    // so we rely on hardhat-deploy to create a ContractFactory for EndpointV2Mock
    //
    // See https://github.com/NomicFoundation/hardhat/issues/1040
  });

  // beforeEach hook for setup that runs before each test in the block
  beforeEach(async function () {
    // Deploying a mock LZEndpoint with the given Endpoint ID
    mockEndpointA = (await deployContract("EndpointV2LocalMock", [eidA], { wallet: endpointOwner })) as EndpointV2Mock;
    mockEndpointB = (await deployContract("EndpointV2LocalMock", [eidB], { wallet: endpointOwner })) as EndpointV2Mock;

    // Deploying two instances of MyOFT contract with different identifiers and linking them to the mock LZEndpoint
    myOFTA = (await deployContract("OFTMock", ["aOFT", "aOFT", mockEndpointA.address, ownerA.address], {
      wallet: ownerA,
    })) as OFTMock;
    myOFTB = (await deployContract("OFTMock", ["bOFT", "bOFT", mockEndpointB.address, ownerB.address], {
      wallet: ownerB,
    })) as OFTMock;

    // Setting destination endpoints in the LZEndpoint mock for each MyOFT instance
    await mockEndpointA.setDestLzEndpoint(myOFTB.address, mockEndpointB.address);
    await mockEndpointB.setDestLzEndpoint(myOFTA.address, mockEndpointA.address);

    // Setting each MyOFT instance as a peer of the other in the mock LZEndpoint
    await myOFTA.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(myOFTB.address, 32));
    await myOFTB.connect(ownerB).setPeer(eidA, ethers.utils.zeroPad(myOFTA.address, 32));
  });

  // A test case to verify token transfer functionality
  it("should send a token from A address to B address via each OFT", async function () {
    // Minting an initial amount of tokens to ownerA's address in the myOFTA contract
    const initialAmount = ethers.utils.parseEther("100");
    await myOFTA.mint(ownerA.address, initialAmount);

    // Defining the amount of tokens to send and constructing the parameters for the send operation
    const tokensToSend = ethers.utils.parseEther("1");

    // Defining extra message execution options for the send operation
    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();

    const sendParam = {
      dstEid: eidB,
      to: ethers.utils.zeroPad(ownerB.address, 32),
      amountLD: tokensToSend,
      minAmountLD: tokensToSend,
      extraOptions: options,
      composeMsg: "0x",
      oftCmd: "0x",
    };

    // Fetching the native fee for the token send operation
    const [nativeFee] = await myOFTA.quoteSend(sendParam, false);

    // Executing the send operation from myOFTA contract
    await myOFTA.send(sendParam, { nativeFee, lzTokenFee: 0 }, ownerA.address, {
      value: nativeFee,
    });

    // Fetching the final token balances of ownerA and ownerB
    const finalBalanceA = await myOFTA.balanceOf(ownerA.address);
    const finalBalanceB = await myOFTB.balanceOf(ownerB.address);

    // Asserting that the final balances are as expected after the send operation
    expect(finalBalanceA.eq(initialAmount.sub(tokensToSend))).to.be.true;
    expect(finalBalanceB.eq(tokensToSend)).to.be.true;
  });
});
