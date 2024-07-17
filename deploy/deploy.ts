import { ChainBase, ExecutionChain, IChainBase, VotingChain, prepareUninstallAdmin } from "../test/e2e/base";
import {
  prepareSetupAdminXChain,
  prepareSetupRelay,
  setupVotingChain,
  applyInstallationsSetPeersRevokeAdmin,
} from "../test/e2e/voting-chain";
import {
  ActionRelay__factory,
  AdminSetupZkSync__factory,
  AdminXChainSetup__factory,
  Admin__factory,
  DAO__factory,
  GovernanceOFTAdapter__factory,
  MockDAOFactory__factory,
  MockPluginSetupProcessor__factory,
  ToucanReceiver__factory,
  ToucanRelaySetup__factory,
} from "../typechain";
import { getWallet } from "./utils";

const RECEIVER_ADDRESS = "0x2cb5e3A3C58B84ed322d4b2325f2fB196976aE31";
const ACTION_RELAY_ADDRESS = "0x75Ec043f0Ab838d274d544F147D8ae0f5De9d8E5";
const ADAPTER_ADDRESS = "0x8D3439c61cfb233bdc2C009a0ea0585269F7Eb3B";

// mocks - don't use in prod
// const ADAPTER_ADDRESS = "0x59c6995E998f97A5a0044966f0945386E01A1bE7";
// const RECEIVER_ADDRESS = "0x2c2a3B3e9372f65B84D5616e2B639b0Ff7A45B8D";
// const ACTION_RELAY_ADDRESS = "0x6b0c1b1d4A44e9E5B16D2C64bF3d6c8F79c9Db1D";
const pk = process.env.WALLET_PRIVATE_KEY;
if (!pk) {
  throw new Error("WALLET_PRIVATE_KEY env variable is required");
}

if ([ADAPTER_ADDRESS, RECEIVER_ADDRESS, ACTION_RELAY_ADDRESS].some((a) => a === "0x" || !a)) {
  throw new Error("Please add the addresses of the contracts on the execution chain");
}

const deployerWallet = getWallet(pk);

// deploy zkSync connected to Arbitrum Sepolia as the execution chain
const votingConfig: IChainBase = {
  chainid: 324,
  eid: 30165,
  chainName: "zkSync Era Mainnet",
  deployer: deployerWallet,
  layerZeroEndpoint: "0xd07C30aF3Ff30D96BDc9c6044958230Eb797DDBF",
  voter: deployerWallet.address,
};

const executionConfig: IChainBase = {
  chainid: 42161,
  eid: 30110,
  chainName: "Arbitrum",
  deployer: deployerWallet,
  layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
  voter: deployerWallet.address,
};

// this deploys to the zkSync network but assumes you've already deployed
// on arb  and can add the addresses above
export default async function () {
  // setup the voting chain
  const v = await setupVotingChain(votingConfig);

  // configure the execution chain
  const e: ExecutionChain = new ExecutionChain(new ChainBase(executionConfig));

  // add the required contracts to the execution chain
  e.actionRelay = ActionRelay__factory.connect(ACTION_RELAY_ADDRESS, deployerWallet);
  e.adapter = GovernanceOFTAdapter__factory.connect(ADAPTER_ADDRESS, deployerWallet);
  e.receiver = ToucanReceiver__factory.connect(RECEIVER_ADDRESS, deployerWallet);

  // configure the voting chain
  await prepareSetupRelay(v, e);
  await prepareSetupAdminXChain(v);
  await prepareUninstallAdmin(v.base);
  await applyInstallationsSetPeersRevokeAdmin(v, e);

  console.log("VotingChain:");
  console.log("  chainName: ", v.base.chainName);
  console.log("  eid: ", v.base.eid);
  console.log("  lzEndpoint: ", v.base.lzEndpoint);
  console.log("  deployer: ", v.base.deployer.address);

  console.log("DAO and Contracts");
  console.log("  dao: ", v.base.dao.address);
  console.log("  relay: ", v.relay.address);
  console.log("  adminXChain: ", v.adminXChain.address);
  console.log("  bridge: ", v.bridge.address);
  console.log("  token: ", v.token.address);

  console.log("ExecutionChain Data:");
  console.log("  chainName: ", e.base.chainName);
  console.log("  eid: ", e.base.eid);
  console.log("  receiver: ", e.receiver.address);
  console.log("  actionRelay: ", e.actionRelay.address);
  console.log("  adapter: ", e.adapter.address);
}
