import * as ethers from "ethers";
import { Wallet } from "zksync-ethers";
import {
  ActionRelay,
  Admin,
  AdminSetup,
  AdminXChain,
  AdminXChainSetup,
  DAO,
  GovernanceERC20,
  GovernanceERC20VotingChain,
  GovernanceOFTAdapter,
  MockDAOFactory,
  MockPluginSetupProcessor,
  OFTTokenBridge,
  ToucanReceiver,
  ToucanReceiverSetup,
  ToucanRelay,
  ToucanRelaySetup,
  ToucanVoting,
  ToucanVotingSetup,
  GovernanceERC20__factory,
  ToucanVotingSetup__factory,
  ToucanReceiverSetup__factory,
  ToucanVoting__factory,
  ActionRelay__factory,
  ToucanReceiver__factory,
  GovernanceOFTAdapter__factory,
  GovernanceERC20VotingChain__factory,
  ToucanRelay__factory,
  AdminXChain__factory,
  OFTTokenBridge__factory,
  AdminXChainSetup__factory,
  ToucanRelaySetup__factory,
  IPluginSetup,
  MockDAOFactory__factory,
  MockPluginSetupProcessor__factory,
  Admin__factory,
  DAO__factory,
  EndpointV2LocalMock,
  EndpointV2LocalMock__factory,
} from "../../typechain";
import { Address } from "zksync-ethers/build/types";
import { PermissionLib } from "../../typechain/@aragon/osx/core/dao/DAO";
import { DAORegisteredEvent, PluginSetupRefStruct } from "../../typechain/contracts/helpers/osx/MockDAOFactory";
import { Interface, LogDescription } from "ethers/lib/utils";
import { LOCAL_RICH_WALLETS, deployContract } from "../../deploy/utils";
import { InstallationPreparedEvent } from "../../typechain/contracts/helpers/osx/MockPSP.sol/MockPluginSetupProcessor";

export const EXECUTION_VOTER = LOCAL_RICH_WALLETS[1];
export const VOTING_VOTER = LOCAL_RICH_WALLETS[2];

export type MultiTargetPermission = PermissionLib.MultiTargetPermissionStruct;

export enum VotingMode {
  Standard,
  EarlyExecution,
  VoteReplacement,
}

export interface ChainBase {
  chainName: string;
  eid: number;
  chainid: number;
  lzEndpoint: Address;
  dao: DAO;
  psp: MockPluginSetupProcessor;
  daoFactory: MockDAOFactory;
  deployer: Wallet;
  adminSetup: AdminSetup;
  admin: Admin;
  adminUninstallPermissions: MultiTargetPermission[];
  voter: Address;
}

export interface VotingChain {
  base: ChainBase;
  token: GovernanceERC20VotingChain;
  relay: ToucanRelay;
  adminXChain: AdminXChain;
  bridge: OFTTokenBridge;
  adminXChainSetup: AdminXChainSetup;
  relaySetup: ToucanRelaySetup;
  toucanRelayPermissions: MultiTargetPermission[];
  adminXChainPermissions: MultiTargetPermission[];
}

export interface ExecutionChain {
  base: ChainBase;
  token: GovernanceERC20;
  adapter: GovernanceOFTAdapter;
  receiver: ToucanReceiver;
  actionRelay: ActionRelay;
  voting: ToucanVoting;
  receiverSetup: ToucanReceiverSetup;
  votingSetup: ToucanVotingSetup;
  receiverPermissions: MultiTargetPermission[];
  votingPermissions: MultiTargetPermission[];
}

export interface IChainBase {
  chainName: string;
  chainid: number;
  deployer: Wallet;
  eid: number;
  voter: Address;
  layerZeroEndpoint?: Address;
}

export class ChainBase {
  constructor({ chainName, chainid, deployer, eid, voter, layerZeroEndpoint }: IChainBase) {
    this.chainName = chainName;
    this.eid = eid;
    this.chainid = chainid;
    this.lzEndpoint = ethers.constants.AddressZero;
    this.deployer = deployer;
    this.voter = voter;
    if (layerZeroEndpoint) {
      this.lzEndpoint = layerZeroEndpoint;
    }
  }
}

export class ExecutionChain {
  constructor(base: ChainBase) {
    this.base = base;
    this.token = GovernanceERC20__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.adapter = GovernanceOFTAdapter__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.receiver = ToucanReceiver__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.actionRelay = ActionRelay__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.voting = ToucanVoting__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.receiverSetup = ToucanReceiverSetup__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.votingSetup = ToucanVotingSetup__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.receiverPermissions = [];
    this.votingPermissions = [];
  }
}

export class VotingChain {
  constructor(base: ChainBase) {
    this.base = base;
    this.token = GovernanceERC20VotingChain__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.relay = ToucanRelay__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.adminXChain = AdminXChain__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.bridge = OFTTokenBridge__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.adminXChainSetup = AdminXChainSetup__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.relaySetup = ToucanRelaySetup__factory.connect(ethers.constants.AddressZero, base.deployer);
    this.toucanRelayPermissions = [];
    this.adminXChainPermissions = [];
  }
}

export function mockPrepareInstallationParams(data: string): MockPluginSetupProcessor.PrepareInstallationParamsStruct {
  return {
    pluginSetupRef: mockPluginSetupRef,
    data: data,
  };
}

export function mockApplyInstallationParams(
  plugin: string,
  permissions: PermissionLib.MultiTargetPermissionStruct[]
): MockPluginSetupProcessor.ApplyInstallationParamsStruct {
  return {
    pluginSetupRef: mockPluginSetupRef,
    plugin: plugin,
    permissions: permissions,
    helpersHash: ethers.utils.formatBytes32String("helpersHash"),
  };
}

export function mockPrepareUninstallationParams(
  payload: IPluginSetup.SetupPayloadStruct
): MockPluginSetupProcessor.PrepareUninstallationParamsStruct {
  return {
    pluginSetupRef: mockPluginSetupRef,
    setupPayload: payload,
  };
}

export function mockApplyUninstallationParams(
  plugin: string,
  permissions: PermissionLib.MultiTargetPermissionStruct[]
): MockPluginSetupProcessor.ApplyUninstallationParamsStruct {
  return {
    plugin: plugin,
    pluginSetupRef: mockPluginSetupRef,
    permissions: permissions,
  };
}

export type InstallationParamsStruct = {
  lzEndpoint: Address;
  tokenName: string;
  tokenSymbol: string;
  dstEid: number;
  votingBridgeBuffer: number;
};

export type TokenSettingsStruct = {
  addr: Address;
  symbol: string;
  name: string;
};

export const mockDAOSettings: MockDAOFactory.DAOSettingsStruct = {
  trustedForwarder: ethers.constants.AddressZero,
  daoURI: "test",
  subdomain: "test",
  metadata: "0x",
};

export const mockPluginSetupRef: PluginSetupRefStruct = {
  pluginSetupRepo: ethers.constants.AddressZero,
  versionTag: {
    build: 0,
    release: 1,
  },
};

export const mockPluginSettings = (data: string): MockDAOFactory.PluginSettingsStruct[] => [
  {
    data,
    pluginSetupRef: mockPluginSetupRef,
  },
];

export async function findEventTopicLog<T>(
  tx: ethers.ContractTransaction,
  iface: Interface,
  eventName: string
): Promise<LogDescription & (T | LogDescription)> {
  const receipt = await tx.wait();
  const topic = iface.getEventTopic(eventName);
  const log = receipt.logs.find((x) => x.topics[0] === topic);
  if (!log) {
    throw new Error(`No logs found for the topic of event "${eventName}".`);
  }
  return iface.parseLog(log) as LogDescription & (T | LogDescription);
}

export const EVENTS = {
  PluginRepoRegistered: "PluginRepoRegistered",
  DAORegistered: "DAORegistered",
  InstallationPrepared: "InstallationPrepared",
  InstallationApplied: "InstallationApplied",
  UpdateApplied: "UpdateApplied",
  UninstallationApplied: "UninstallationApplied",
  MetadataSet: "MetadataSet",
  TrustedForwarderSet: "TrustedForwarderSet",
  NewURI: "NewURI",
  Revoked: "Revoked",
  Granted: "Granted",
} as const;

/// deploy the mock PSP and DAOFactory with the admin plugin
export async function deployOSX(base: ChainBase): Promise<void> {
  const adminZk = await deployContract("AdminSetupZkSync", [], { wallet: base.deployer });
  const pspZk = await deployContract("MockPluginSetupProcessor", [adminZk.address], { wallet: base.deployer });
  const daoFactoryZk = await deployContract("MockDAOFactory", [pspZk.address], { wallet: base.deployer });

  base.adminSetup = adminZk as AdminSetup;
  base.psp = pspZk as MockPluginSetupProcessor;
  base.daoFactory = daoFactoryZk as MockDAOFactory;
}

export async function extractInfoFromCreateDaoTx(tx: ethers.ContractTransaction): Promise<{
  dao: any;
  creator: any;
  subdomain: any;
  plugin: any;
  helpers: any;
  permissions: any;
}> {
  const daoRegisteredEvent = await findEventTopicLog<DAORegisteredEvent>(
    tx,
    MockDAOFactory__factory.createInterface(),
    EVENTS.DAORegistered
  );

  const installationPreparedEvent = await findEventTopicLog<InstallationPreparedEvent>(
    tx,
    MockPluginSetupProcessor__factory.createInterface(),
    EVENTS.InstallationPrepared
  );

  return {
    dao: daoRegisteredEvent.args.dao,
    creator: daoRegisteredEvent.args.creator,
    subdomain: daoRegisteredEvent.args.subdomain,
    plugin: installationPreparedEvent.args.plugin,
    helpers: installationPreparedEvent.args.preparedSetupData.helpers,
    permissions: installationPreparedEvent.args.preparedSetupData.permissions,
  };
}

export async function deployDAOAndAdmin(base: ChainBase): Promise<void> {
  // use the OSx DAO factory with the Admin Plugin
  const data = ethers.utils.defaultAbiCoder.encode(["address"], [base.deployer.address]);
  const createDaoTx = await base.daoFactory.createDao(mockDAOSettings, mockPluginSettings(data));
  await createDaoTx.wait();
  // console.warn("Might need to await for the transaction to be mined", receipt.transactionHash);
  const info = await extractInfoFromCreateDaoTx(createDaoTx);

  base.dao = DAO__factory.connect(info.dao, base.deployer);
  base.admin = Admin__factory.connect(info.plugin, base.deployer);
}

export async function _deployLayerZero(executionChain: ChainBase, votingChain: ChainBase): Promise<void> {
  const endpointExecutionChain = (await deployContract("EndpointV2LocalMock", [executionChain.eid], {
    wallet: executionChain.deployer,
  })) as EndpointV2LocalMock;
  const endpointVotingChain = (await deployContract("EndpointV2LocalMock", [votingChain.eid], {
    wallet: votingChain.deployer,
  })) as EndpointV2LocalMock;

  executionChain.lzEndpoint = endpointExecutionChain.address;
  votingChain.lzEndpoint = endpointVotingChain.address;
}

export async function wireLayerZero(e: ExecutionChain, v: VotingChain): Promise<void> {
  // define pairs
  const pairs = [
    [e.adapter, v.bridge],
    [e.receiver, v.relay],
    [e.actionRelay, v.adminXChain],
  ];

  // wire them using the mocks
  const endpointExecutionChain = EndpointV2LocalMock__factory.connect(e.base.lzEndpoint, e.base.deployer);
  const endpointVotingChain = EndpointV2LocalMock__factory.connect(v.base.lzEndpoint, v.base.deployer);

  // wire the pairs
  for (const [exec, vot] of pairs) {
    await endpointExecutionChain.setDestLzEndpoint(vot.address, endpointVotingChain.address);
    await endpointVotingChain.setDestLzEndpoint(exec.address, endpointExecutionChain.address);
  }
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
