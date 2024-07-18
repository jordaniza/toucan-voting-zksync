import { ethers } from "ethers";
import { LOCAL_RICH_WALLETS, deployContract, getProvider, getWallet } from "../../deploy/utils";
import {
  AdminXChainSetup,
  AdminXChain__factory,
  GovernanceERC20VotingChain__factory,
  OFTTokenBridge__factory,
  ToucanRelaySetup,
  ToucanRelay__factory,
} from "../../typechain";
import {
  ChainBase,
  ExecutionChain,
  IChainBase,
  InstallationParamsStruct,
  VOTING_VOTER,
  VotingChain,
  deployDAOAndMultisig,
  deployOSX,
  mockPrepareInstallationParams,
} from "./base";
import { votingActions } from "./actions";

export const DEFAULT_VOTING_CHAIN_BASE: IChainBase = {
  eid: 2,
  voter: VOTING_VOTER.address,
  chainName: "ZkSync",
  chainid: 80085,
  deployer: getWallet(LOCAL_RICH_WALLETS[0].privateKey),
};

export async function setupVotingChain(config: IChainBase): Promise<VotingChain> {
  const base = new ChainBase(config);

  const v = new VotingChain(base);

  await deployOSX(v.base);
  await deployDAOAndMultisig(v.base);

  return v;
}

export async function prepareSetupRelay(chain: VotingChain, e: ExecutionChain): Promise<void> {
  const relayBase = await deployContract("ToucanRelay", [], { wallet: chain.base.deployer });
  const bridgeBase = await deployContract("OFTTokenBridge", [], { wallet: chain.base.deployer });
  const erc20VotingChainBase = await deployContract(
    "GovernanceERC20VotingChain",
    [chain.base.dao.address, "TestToken", "TT"],
    { wallet: chain.base.deployer }
  );
  const relaySetup = await deployContract(
    "ToucanRelaySetup",
    [relayBase.address, bridgeBase.address, erc20VotingChainBase.address],
    { wallet: chain.base.deployer }
  );
  chain.relaySetup = relaySetup as ToucanRelaySetup;

  const txQueue = await chain.base.psp.queueSetup(chain.relaySetup.address);
  await txQueue.wait(5);

  const params: InstallationParamsStruct = {
    lzEndpoint: chain.base.lzEndpoint,
    tokenName: "Voting Rust Token",
    tokenSymbol: "vCRAB",
    dstEid: e.base.eid,
    votingBridgeBuffer: 20 * 60, // 20 minutes
  };

  const data = ethers.utils.defaultAbiCoder.encode(
    ["tuple(address lzEndpoint, string tokenName, string tokenSymbol, uint32 dstEid, uint32 votingBridgeBuffer)"],
    [params]
  );

  const [toucanRelayAddress, toucanRelaySetupData] = await chain.base.psp.callStatic.prepareInstallation(
    chain.base.dao.address,
    mockPrepareInstallationParams(data)
  );

  const tx = await chain.base.psp.prepareInstallation(chain.base.dao.address, mockPrepareInstallationParams(data));
  await tx.wait(5);

  chain.toucanRelayPermissions = toucanRelaySetupData.permissions;

  chain.relay = ToucanRelay__factory.connect(toucanRelayAddress, chain.base.deployer);
  const helpers = toucanRelaySetupData.helpers;
  chain.token = GovernanceERC20VotingChain__factory.connect(helpers[0], chain.base.deployer);
  chain.bridge = OFTTokenBridge__factory.connect(helpers[1], chain.base.deployer);
}

export async function prepareSetupAdminXChain(chain: VotingChain): Promise<void> {
  const adminXChainBase = await deployContract("AdminXChain", [], { wallet: chain.base.deployer });

  const adminXChainSetupDeployed = await deployContract("AdminXChainSetup", [adminXChainBase.address], {
    wallet: chain.base.deployer,
  });

  chain.adminXChainSetup = adminXChainSetupDeployed as AdminXChainSetup;

  const txQueue = await chain.base.psp.queueSetup(chain.adminXChainSetup.address);
  await txQueue.wait(5);

  const data = ethers.utils.defaultAbiCoder.encode(["address"], [chain.base.lzEndpoint]);

  const [adminXChainAddress, adminXChainSetupData] = await chain.base.psp.callStatic.prepareInstallation(
    chain.base.dao.address,
    mockPrepareInstallationParams(data)
  );

  const tx = await chain.base.psp.prepareInstallation(chain.base.dao.address, mockPrepareInstallationParams(data));
  await tx.wait(5);

  chain.adminXChainPermissions = adminXChainSetupData.permissions;
  chain.adminXChain = AdminXChain__factory.connect(adminXChainAddress, chain.base.deployer);
}

export async function applyInstallationsSetPeers(chain: VotingChain, executionChain: ExecutionChain): Promise<void> {
  const actions = await votingActions(chain, executionChain);
  const block = await getProvider().getBlock("latest");
  const tx = await chain.base.multisig.createProposal("0x", actions, 0, true, true, 0, block.timestamp + 15 * 60);
  await tx.wait();
}
