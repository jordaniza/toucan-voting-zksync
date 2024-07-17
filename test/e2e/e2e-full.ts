import { BigNumber, ethers } from "ethers";
import {
  EXECUTION_VOTER,
  ExecutionChain,
  VOTING_VOTER,
  VotingChain,
  _deployLayerZero,
  prepareUninstallAdmin,
  wireLayerZero,
} from "./base";
import {
  DEFAULT_EXECUTION_CHAIN_SETUP as DEFAULT_EXECUTION_CHAIN_BASE,
  applyInstallationsSetPeersRevokeAdmin as applyInstallationsSetPeersRevokeAdminExecutionChain,
  prepareSetupReceiver,
  prepareSetupToucanVoting,
  setupExecutionChain,
} from "./execution-chain";
import {
  prepareSetupAdminXChain,
  prepareSetupRelay,
  setupVotingChain,
  applyInstallationsSetPeersRevokeAdmin as applyInstallationsSetPeersRevokeAdminVotingChain,
  DEFAULT_VOTING_CHAIN_BASE,
} from "./voting-chain";
import { Options, hexZeroPadTo32 } from "@layerzerolabs/lz-v2-utilities";
import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { MessagingFeeStruct, SendParamStruct } from "../../typechain/contracts/erc20/MyOFT";
import { expect } from "chai";
import { getWallet } from "../../deploy/utils";
import { IDAO } from "../../typechain";
import { Provider } from "zksync-ethers";
import * as hre from "hardhat";
import { HttpNetworkUserConfig } from "hardhat/types";

const GAS_BRIDGE_TOKENS = 250_000n; // Replace with actual value
const GAS_DISPATCH_VOTES = 500_000n; // Replace with actual value
const GAS_XCHAIN_PROPOSAL = 500_000n; // Replace with actual value
const initialDeal = ethers.utils.parseEther("1000000"); // Replace with actual value
const transferAmount = ethers.utils.parseEther("100000"); // Replace with actual value

describe("Toucan Voting ZkSync Test", function () {
  it("should deploy the DAO and Admin", async function () {
    const e = await setupExecutionChain(DEFAULT_EXECUTION_CHAIN_BASE);
    const v = await setupVotingChain(DEFAULT_VOTING_CHAIN_BASE);
    await _deployLayerZero(e.base, v.base);

    // execution chain
    await prepareSetupToucanVoting(e);
    await prepareSetupReceiver(e);
    await prepareUninstallAdmin(e.base);

    // voting chain
    await prepareSetupRelay(v, e);
    await prepareSetupAdminXChain(v);
    await prepareUninstallAdmin(v.base);

    // now set endpoint with mock
    await wireLayerZero(e, v);

    // // apply installs and set peers
    await applyInstallationsSetPeersRevokeAdminExecutionChain(e, v);
    await applyInstallationsSetPeersRevokeAdminVotingChain(v, e);
    console.log("done applying installations and setting peers");

    let hasExecute = await v.base.dao.isGranted(
      v.base.dao.address,
      v.adminXChain.address,
      await v.base.dao.EXECUTE_PERMISSION_ID(),
      "0x"
    );

    expect(hasExecute).to.eq(true, "Plugin doesn't have execute");

    // bridge tokens
    await bridgeTokens(e, v);
    console.log("done bridging tokens");

    // create proposal
    const proposalId = await createProposal(e, v);
    console.log("done creating proposal");

    // vote and dispatch
    await voteAndDispatch(e, v, proposalId);
    console.log("done voting and dispatching");

    // execute proposal
    await executeBridgeProposal(e, v, proposalId);

    // check the adminXChain no longer has execute on the voting chain dao
    hasExecute = await v.base.dao.isGranted(
      v.base.dao.address,
      v.adminXChain.address,
      await v.base.dao.EXECUTE_PERMISSION_ID(),
      "0x"
    );
    expect(hasExecute).to.eq(false, "Plugin still has execute");
  });
});

export function getTestProvider(): Provider {
  const network = hre.userConfig.networks?.inMemoryNode;
  return new Provider((network as HttpNetworkUserConfig).url);
}

const executionWallet = getWallet(EXECUTION_VOTER.privateKey);
const votingWallet = getWallet(VOTING_VOTER.privateKey);

export const getLzOptions = (gasLimit: bigint) =>
  Options.newOptions().addExecutorLzReceiveOption(gasLimit, 0).toHex().toString() as `0x${string}`;

async function bridgeTokens(e: ExecutionChain, v: VotingChain): Promise<void> {
  // Ensure the execution chain voter has the initial tokens
  const execVoterBalance = await e.token.balanceOf(e.base.voter);

  expect(execVoterBalance.eq(initialDeal)).to.equal(true, `voter balance != ${initialDeal}`);

  // send the voter some tokens to bridge
  await e.token.connect(executionWallet).transfer(v.base.voter, transferAmount);

  const votingVoterBalance = await e.token.balanceOf(v.base.voter);
  const votingVoterBalanceVChain = await v.token.balanceOf(v.base.voter);
  expect(votingVoterBalance.eq(transferAmount)).to.equal(true, `voting voter balance != ${transferAmount}`);
  expect(votingVoterBalanceVChain.eq(0)).to.equal(true, `voting voter balance vchain != 0`);

  // Send the tokens to the voting chain
  const options = getLzOptions(GAS_BRIDGE_TOKENS);
  const sendParams: SendParamStruct = {
    dstEid: v.base.eid,
    to: addressToBytes32(v.base.voter),
    amountLD: transferAmount,
    minAmountLD: transferAmount,
    extraOptions: options,
    composeMsg: "0x",
    oftCmd: "0x",
  };

  const msgFee: MessagingFeeStruct = await e.adapter.quoteSend(sendParams, false);
  const nativeFee = msgFee.nativeFee as ethers.BigNumber;
  const lzTokenFee = msgFee.lzTokenFee as ethers.BigNumber;

  expect(lzTokenFee.eq(0)).to.equal(true, `lzTokenFee != 0`);
  expect(nativeFee.gt(0)).to.equal(true, `nativeFee <= 0`);

  await e.token.connect(votingWallet).approve(e.adapter.address, transferAmount);
  await e.adapter.connect(votingWallet).send(sendParams, msgFee, e.base.deployer.address, { value: nativeFee });

  // Check that the tokens were received
  const finalBalance = await v.token.balanceOf(v.base.voter);
  const finalBalanceEChain = await e.token.balanceOf(v.base.voter);

  expect(finalBalance.eq(transferAmount)).to.equal(true, `final balance != ${transferAmount}`);
  expect(finalBalanceEChain.eq(0)).to.equal(true, `final balance echain != 0`);
}

async function createProposal(e: ExecutionChain, v: VotingChain): Promise<ethers.BigNumber> {
  const blockTimestamp = 100;

  const provider = getTestProvider();

  // had a lot of funny issues here but the below appears to work
  await provider.send("evm_setTime", [blockTimestamp]);
  await provider.send("evm_mine", []);

  const votes = { yes: 100_000, no: 200_000, abstain: 300_000 }; // Tally structure

  const actions = await createUninstallationProposal(e, v);

  const proposalId = await e.voting.connect(executionWallet).callStatic.createProposal(
    "0x",
    actions,
    0,
    0, // start immediate
    blockTimestamp + 10 * 24 * 60 * 60, //  end 10 days from now
    votes,
    false
  );

  const tx = await e.voting.connect(executionWallet).createProposal(
    "0x",
    actions,
    0,
    0, // start immediate
    blockTimestamp + 10 * 24 * 60 * 60, //  end 10 days from now
    votes,
    false
  );

  await tx.wait();

  return proposalId;
}

async function voteAndDispatch(e: ExecutionChain, v: VotingChain, proposalId: BigNumber): Promise<void> {
  const provider = getTestProvider();
  const blockTimestamp = await provider.getBlock("latest").then((block) => block.timestamp);

  // Warp it forward 1 second to allow voting
  await provider.send("evm_setTime", [blockTimestamp + 1]);
  await provider.send("evm_mine", []);

  const proposalRef = await e.receiver["getProposalRef(uint256)"](proposalId);

  // Cast the vote
  await v.relay.connect(votingWallet).vote(proposalRef, { no: 0, yes: transferAmount, abstain: 0 });

  // Get a cross-chain quote
  const quote = await v.relay.connect(votingWallet).quote(proposalRef, GAS_DISPATCH_VOTES);

  // Dispatch the votes
  const tx = await v.relay.connect(votingWallet).dispatchVotes(proposalRef, quote, { value: quote.fee.nativeFee });

  // check the votes were recorded
  const proposal = await e.voting.getProposal(proposalId);

  expect(proposal.tally.no.eq(200_000)).to.equal(true, `no votes != 200_000`);
  expect(proposal.tally.yes.eq(BigNumber.from(100_000).add(transferAmount))).to.equal(
    true,
    `yes votes != ${transferAmount} plus 100k`
  );
  expect(proposal.tally.abstain.eq(300_000)).to.equal(true, `abstain votes != 300k`);
}

async function executeBridgeProposal(e: ExecutionChain, v: VotingChain, proposalId: BigNumber): Promise<void> {
  const provider = getTestProvider();
  const blockTimestamp = await provider.getBlock("latest").then((block) => block.timestamp);

  // Warp it forward 10 days to the end of the proposal
  await provider.send("evm_setTime", [blockTimestamp + 10 * 24 * 60 * 60]);
  await provider.send("evm_mine", []);

  // Send the DAO some cash to pay for the cross-chain fees
  const tx = {
    to: e.base.dao.address,
    value: ethers.utils.parseEther("10"), // 10 ether
  };
  const transactionResponse = await executionWallet.sendTransaction(tx);
  await transactionResponse.wait();

  // Check if the transaction was successful
  const daoBalance = await e.base.deployer.provider.getBalance(e.base.dao.address);
  expect(daoBalance.eq(ethers.utils.parseEther("10"))).to.equal(
    true,
    `dao balance != ${ethers.utils.parseEther("10")}`
  );

  // // Execute the proposal
  const tx2 = await e.voting.connect(executionWallet).execute(proposalId);
  await tx2.wait();
}

async function createUninstallationProposal(e: ExecutionChain, v: VotingChain): Promise<IDAO.ActionStruct[]> {
  const proposalCount = await e.voting.proposalCount();
  const executePermissionId = await v.base.dao.EXECUTE_PERMISSION_ID();

  const innerActions: IDAO.ActionStruct[] = [
    {
      to: v.base.dao.address,
      value: 0,
      data: v.base.dao.interface.encodeFunctionData("revoke", [
        v.base.dao.address,
        v.adminXChain.address,
        executePermissionId,
      ]),
    },
  ];

  const params = await e.actionRelay.quote(
    proposalCount, // proposal id that will be created
    innerActions,
    0, // allowFailureMap
    v.base.eid,
    GAS_XCHAIN_PROPOSAL
  );

  const actions: IDAO.ActionStruct[] = [
    {
      to: e.actionRelay.address,
      value: params.fee.nativeFee,
      data: e.actionRelay.interface.encodeFunctionData("relayActions", [
        proposalCount,
        innerActions,
        0, // allowFailureMap
        params,
      ]),
    },
  ];

  return actions;
}
