import { expect } from "chai";
import { Contract } from "ethers";
import * as ethers from "ethers";

import { Options } from "@layerzerolabs/lz-v2-utilities";
import { LOCAL_RICH_WALLETS, deployContract, getWallet } from "../../deploy/utils";
import { Signer, Wallet } from "zksync-ethers";

import {
  ActionRelay,
  Admin,
  AdminSetup,
  AdminSetup__factory,
  AdminXChain,
  AdminXChainSetup,
  Admin__factory,
  DAO,
  DAO__factory,
  EndpointV2,
  EndpointV2Mock,
  GovernanceERC20,
  GovernanceERC20VotingChain,
  GovernanceOFTAdapter,
  MockDAOFactory,
  MockDAOFactory__factory,
  MockPluginSetupProcessor,
  MockPluginSetupProcessor__factory,
  MyOFT,
  OFT,
  OFTMock,
  OFTTokenBridge,
  ToucanReceiver,
  ToucanReceiverSetup,
  ToucanRelay,
  ToucanRelaySetup,
  ToucanVoting,
  ToucanVotingSetup,
  PluginRepo,
  PluginRepo__factory,
  IPluginSetup,
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
  EndpointV2LocalMock__factory,
  EndpointV2LocalMock,
  EndpointV2__factory,
  T,
  D,
  T__factory,
  PTFactory,
} from "../../typechain";
import { Address } from "zksync-ethers/build/types";

import { PermissionLib } from "../../typechain/@aragon/osx/core/dao/DAO";
import {
  InstallationPreparedEvent,
  PluginSetupRefStruct,
} from "../../typechain/contracts/helpers/osx/MockPSP.sol/MockPluginSetupProcessor";
import { Interface, LogDescription } from "ethers/lib/utils";
import { DAORegisteredEvent } from "../../typechain/contracts/helpers/osx/MockDAOFactory";

type MultiTargetPermission = PermissionLib.MultiTargetPermissionStruct;

interface ChainBase {
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
}

interface VotingChain {
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

interface ExecutionChain {
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

class ChainBase {
  constructor(chainName: string, chainid: number, deployer: Wallet, eid: number) {
    this.chainName = chainName;
    this.eid = eid;
    this.chainid = chainid;
    this.lzEndpoint = ethers.constants.AddressZero;
    this.deployer = deployer;
  }
}

class ExecutionChain {
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

class VotingChain {
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

/// deploy the mock PSP and DAOFactory with the admin plugin
async function deployOSX(base: ChainBase): Promise<void> {
  const adminZk = await deployContract("AdminSetupZkSync", [], { wallet: base.deployer });
  const pspZk = await deployContract("MockPluginSetupProcessor", [adminZk.address], { wallet: base.deployer });
  const daoFactoryZk = await deployContract("MockDAOFactory", [pspZk.address], { wallet: base.deployer });

  base.adminSetup = adminZk as AdminSetup;
  base.psp = pspZk as MockPluginSetupProcessor;
  base.daoFactory = daoFactoryZk as MockDAOFactory;
}

const mockDAOSettings: MockDAOFactory.DAOSettingsStruct = {
  trustedForwarder: ethers.constants.AddressZero,
  daoURI: "test",
  subdomain: "test",
  metadata: "0x",
};

const mockPluginSetupRef: PluginSetupRefStruct = {
  pluginSetupRepo: ethers.constants.AddressZero,
  versionTag: {
    build: 0,
    release: 1,
  },
};

const mockPluginSettings = (data: string): MockDAOFactory.PluginSettingsStruct[] => [
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

const EVENTS = {
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
};

async function extractInfoFromCreateDaoTx(tx: ethers.ContractTransaction): Promise<{
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

async function deployDAOAndAdmin(base: ChainBase): Promise<void> {
  // use the OSx DAO factory with the Admin Plugin
  const data = ethers.utils.defaultAbiCoder.encode(["address"], [base.deployer.address]);
  const createDaoTx = await base.daoFactory.createDao(mockDAOSettings, mockPluginSettings(data));
  // console.warn("Might need to await for the transaction to be mined", receipt.transactionHash);
  const info = await extractInfoFromCreateDaoTx(createDaoTx);

  base.dao = info.dao;
  base.admin = Admin__factory.connect(info.plugin, base.deployer);
}

async function prepareUninstallAdmin(base: ChainBase): Promise<void> {
  // psp will use the admin setup in next call
  await base.psp.queueSetup(base.adminSetup.address);

  const payload: IPluginSetup.SetupPayloadStruct = {
    plugin: base.admin.address,
    currentHelpers: [],
    data: "0x",
  };

  const { permissions, tx } = await prepareUninstall(base, payload);
}

function mockPrepareInstallationParams(data: string): MockPluginSetupProcessor.PrepareInstallationParamsStruct {
  return {
    pluginSetupRef: mockPluginSetupRef,
    data: data,
  };
}

function mockApplyInstallationParams(
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

function mockPrepareUninstallationParams(
  payload: IPluginSetup.SetupPayloadStruct
): MockPluginSetupProcessor.PrepareUninstallationParamsStruct {
  return {
    pluginSetupRef: mockPluginSetupRef,
    setupPayload: payload,
  };
}

function mockApplyUninstallationParams(
  plugin: string,
  permissions: PermissionLib.MultiTargetPermissionStruct[]
): MockPluginSetupProcessor.ApplyUninstallationParamsStruct {
  return {
    plugin: plugin,
    pluginSetupRef: mockPluginSetupRef,
    permissions: permissions,
  };
}

// callstatic to return the permissions and the tx to apply the installation
async function prepareUninstall(
  base: ChainBase,
  payload: IPluginSetup.SetupPayloadStruct
): Promise<{ permissions: PermissionLib.MultiTargetPermissionStruct[]; tx: ethers.ContractTransaction }> {
  const [permissions, tx] = await Promise.all([
    base.psp.callStatic.prepareUninstallation(base.dao.address, mockPrepareUninstallationParams(payload)),
    base.psp.prepareUninstallation(base.dao.address, mockPrepareUninstallationParams(payload)),
  ]);

  base.adminUninstallPermissions = permissions;

  return { permissions, tx };
}

async function setupExecutionChain(): Promise<ExecutionChain> {
  const base = new ChainBase("Ethereum", 80085, getWallet(LOCAL_RICH_WALLETS[0].privateKey), 1);

  const e = new ExecutionChain(base);

  await deployOSX(e.base);
  await deployDAOAndAdmin(e.base);

  return e;
}

async function setupVotingChain(): Promise<VotingChain> {
  const base = new ChainBase("ZkSync", 80085, getWallet(LOCAL_RICH_WALLETS[0].privateKey), 2);

  const v = new VotingChain(base);

  await deployOSX(v.base);
  await deployDAOAndAdmin(v.base);

  return v;
}

async function _deployLayerZero(executionChain: ChainBase, votingChain: ChainBase): Promise<void> {
  const endpointExecutionChain = await new EndpointV2LocalMock__factory(executionChain.deployer).deploy(
    executionChain.eid
  );
  const endpointVotingChain = await new EndpointV2LocalMock__factory(votingChain.deployer).deploy(votingChain.eid);

  executionChain.lzEndpoint = endpointExecutionChain.address;
  votingChain.lzEndpoint = endpointVotingChain.address;
}

async function deployNewDAO(): Promise<void> {
  await deployContract("DAO", [], { wallet: getWallet(LOCAL_RICH_WALLETS[0].privateKey) });
}

describe("Toucan Voting ZkSync Test", function () {
  it("should deploy the DAO and Admin", async function () {
    const e = await setupExecutionChain();
    // const v = await setupVotingChain();
    // await _deployLayerZero(e.base, v.base);
  });
});
