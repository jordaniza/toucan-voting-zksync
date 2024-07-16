import { ethers } from "ethers";
import { LOCAL_RICH_WALLETS, deployContract, getWallet } from "../../deploy/utils";
import {
  ActionRelay__factory,
  GovernanceERC20,
  GovernanceERC20__factory,
  GovernanceOFTAdapter__factory,
  IPluginSetup,
  IToucanVoting,
  ToucanReceiverSetup,
  ToucanReceiver__factory,
  ToucanVotingSetup,
  ToucanVoting__factory,
} from "../../typechain";
import {
  ChainBase,
  EXECUTION_VOTER,
  ExecutionChain,
  TokenSettingsStruct,
  VotingChain,
  VotingMode,
  deployDAOAndAdmin,
  deployOSX,
  mockPrepareInstallationParams,
  mockPrepareUninstallationParams,
} from "./base";
import { PermissionLib } from "../../typechain/contracts/execution-chain/voting/ToucanVotingSetup";
import { executionActions } from "./actions";

export async function setupExecutionChain(): Promise<ExecutionChain> {
  const base = new ChainBase(
    "Ethereum",
    80085,
    getWallet(LOCAL_RICH_WALLETS[0].privateKey),
    1,
    EXECUTION_VOTER.address
  );

  const e = new ExecutionChain(base);

  await deployOSX(e.base);
  await deployDAOAndAdmin(e.base);

  return e;
}

export async function prepareSetupToucanVoting(chain: ExecutionChain): Promise<void> {
  const mintSettings: GovernanceERC20.MintSettingsStruct = {
    receivers: [chain.base.deployer.address],
    amounts: [ethers.BigNumber.from(0)],
  };

  const baseToken = await deployContract(
    "GovernanceERC20",
    [chain.base.dao.address, "Test Token", "TT", mintSettings],
    { wallet: chain.base.deployer }
  );

  const toucanVotingBase = await deployContract("ToucanVoting", [], { wallet: chain.base.deployer });

  const wrappedGovBase = await deployContract(
    "GovernanceWrappedERC20",
    [baseToken.address, "Wrapped Test Token", "WTT"],
    {
      wallet: chain.base.deployer,
    }
  );

  chain.votingSetup = (await deployContract(
    "ToucanVotingSetup",
    [toucanVotingBase.address, baseToken.address, wrappedGovBase.address],
    { wallet: chain.base.deployer }
  )) as ToucanVotingSetup;

  await chain.base.psp.queueSetup(chain.votingSetup.address);

  const votingSettings: IToucanVoting.VotingSettingsStruct = {
    votingMode: VotingMode.VoteReplacement,
    supportThreshold: ethers.BigNumber.from(1e5),
    minParticipation: ethers.BigNumber.from(1e5),
    minDuration: 24 * 60 * 60, // 1 day in seconds
    minProposerVotingPower: ethers.utils.parseEther("1"),
  };

  const tokenSettings: TokenSettingsStruct = {
    addr: ethers.constants.AddressZero,
    symbol: "CRAB",
    name: "Rust Token",
  };

  // mint to the voter who will transfer to amigos later
  mintSettings.receivers[0] = chain.base.voter;
  mintSettings.amounts[0] = ethers.utils.parseEther("1000000");

  const data = ethers.utils.defaultAbiCoder.encode(
    [
      "tuple(uint8 votingMode, uint256 supportThreshold, uint256 minParticipation, uint256 minDuration, uint256 minProposerVotingPower)",
      "tuple(address addr, string symbol, string name)",
      "tuple(address[] receivers, uint256[] amounts)",
      "bool",
    ],
    [votingSettings, tokenSettings, mintSettings, false]
  );

  const [votingPluginAddress, votingPluginPreparedSetupData] = await chain.base.psp.callStatic.prepareInstallation(
    chain.base.dao.address,
    mockPrepareInstallationParams(data)
  );

  const tx = await chain.base.psp.prepareInstallation(chain.base.dao.address, mockPrepareInstallationParams(data));

  chain.votingPermissions = votingPluginPreparedSetupData.permissions;

  chain.voting = ToucanVoting__factory.connect(votingPluginAddress, chain.base.deployer);
  const helpers = votingPluginPreparedSetupData.helpers;
  chain.token = GovernanceERC20__factory.connect(helpers[0], chain.base.deployer);
}

export async function prepareSetupReceiver(chain: ExecutionChain): Promise<void> {
  const receiverBase = await deployContract("ToucanReceiver", [], { wallet: chain.base.deployer });
  const adapterBase = await deployContract("GovernanceOFTAdapter", [], { wallet: chain.base.deployer });
  const actionRelayBase = await deployContract("ActionRelay", [], { wallet: chain.base.deployer });

  chain.receiverSetup = (await deployContract(
    "ToucanReceiverSetup",
    [receiverBase.address, adapterBase.address, actionRelayBase.address],
    { wallet: chain.base.deployer }
  )) as ToucanReceiverSetup;

  await chain.base.psp.queueSetup(chain.receiverSetup.address);

  const data = ethers.utils.defaultAbiCoder.encode(
    ["address", "address"],
    [chain.base.lzEndpoint, chain.voting.address]
  );

  const [receiverPluginAddress, receiverPluginPreparedSetupData] = await chain.base.psp.callStatic.prepareInstallation(
    chain.base.dao.address,
    mockPrepareInstallationParams(data)
  );

  const tx = await chain.base.psp.prepareInstallation(chain.base.dao.address, mockPrepareInstallationParams(data));

  chain.receiverPermissions = receiverPluginPreparedSetupData.permissions;

  chain.receiver = ToucanReceiver__factory.connect(receiverPluginAddress, chain.base.deployer);
  const helpers = receiverPluginPreparedSetupData.helpers;
  chain.adapter = GovernanceOFTAdapter__factory.connect(helpers[0], chain.base.deployer);
  chain.actionRelay = ActionRelay__factory.connect(helpers[1], chain.base.deployer);
}

export async function prepareUninstallAdmin(base: ChainBase): Promise<void> {
  await base.psp.queueSetup(base.adminSetup.address);

  const payload: IPluginSetup.SetupPayloadStruct = {
    plugin: base.admin.address,
    currentHelpers: [],
    data: "0x",
  };

  const permissions: PermissionLib.MultiTargetPermissionStruct[] = await base.psp.callStatic.prepareUninstallation(
    base.dao.address,
    mockPrepareUninstallationParams(payload)
  );

  const tx = await base.psp.prepareUninstallation(base.dao.address, mockPrepareUninstallationParams(payload));
  await tx.wait();

  base.adminUninstallPermissions = permissions;
}

export async function applyInstallationsSetPeersRevokeAdmin(
  chain: ExecutionChain,
  votingChain: VotingChain
): Promise<void> {
  const actions = await executionActions(chain, votingChain);

  const tx = await chain.base.admin.executeProposal("0x", actions, 0);
  await tx.wait();
}
