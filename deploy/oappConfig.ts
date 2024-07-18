import { ethers } from "ethers";
import { getProvider, getWallet } from "./utils";
import {
  AdminXChain__factory,
  DAO__factory,
  IDAO,
  IMessageLibManager__factory,
  Multisig__factory,
  ToucanRelay__factory,
} from "../typechain";

// Constants
const ME = "0x7771c1510509C0dA515BDD12a57dbDd8C58E5363";

const CONFIRMATIONS = 1;
const REQUIREDDVNCOUNT = 1;
const OPTIONALDVNCOUNT = 0;
const OPTIONALDVNTHRESHOLD = 0;
const MAXMESSAGESIZE = 2 ** 32 - 1;

// Struct equivalents in TypeScript
interface OAppConfChain {
  executor: string;
  l0dvn: string;
  eid: number;
  sendLib: string;
  receiveLib: string;
}

interface SetConfigParam {
  eid: number;
  configType: number;
  config: string;
}

function ulnConfig(srcChain: OAppConfChain, dstChain: OAppConfChain): SetConfigParam {
  const requiredDVNs = [srcChain.l0dvn];
  const config = ethers.utils.defaultAbiCoder.encode(
    [
      "tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)",
    ],
    [
      {
        confirmations: CONFIRMATIONS,
        requiredDVNCount: REQUIREDDVNCOUNT,
        optionalDVNCount: OPTIONALDVNCOUNT,
        optionalDVNThreshold: OPTIONALDVNTHRESHOLD,
        requiredDVNs,
        optionalDVNs: [],
      },
    ]
  );

  return {
    eid: dstChain.eid,
    configType: 2,
    config,
  };
}

function executorConfig(srcChain: OAppConfChain, dstChain: OAppConfChain): SetConfigParam {
  const config = ethers.utils.defaultAbiCoder.encode(
    ["tuple(uint32 maxMessageSize, address executorAddress)"],
    [
      {
        maxMessageSize: MAXMESSAGESIZE,
        executorAddress: srcChain.executor,
      },
    ]
  );

  return {
    eid: dstChain.eid,
    configType: 1,
    config,
  };
}

function setReceiveConfigParams(srcChain: OAppConfChain, dstChain: OAppConfChain): SetConfigParam[] {
  return [ulnConfig(srcChain, dstChain)];
}

function setSendConfigParams(srcChain: OAppConfChain, dstChain: OAppConfChain): SetConfigParam[] {
  return [ulnConfig(srcChain, dstChain), executorConfig(srcChain, dstChain)];
}

const OFT_TOKEN_BRIDGE = "0xAB1b5e2B7feF10231d6B1B60893af0C70fBAB7a0";
const LZ_ENDPOINT = "0xd07C30aF3Ff30D96BDc9c6044958230Eb797DDBF";
const MULTISIG_ADDRESS = "0xf4999519a41599bd61dfaBB276F077CdddD7f38a";
const DAO_ADDRESS = "0x21558950C9645702B4e8a9818C39e1911f5d12c7";
const RELAY_ADDRESS = "0x81b354B610E6F5E117f42Dae7e1F654440ACc7c1";
const ADMIN_X_CHAIN_ADDRESS = "0x7E10952B1eB3cfdEe715D335C028545b4E23C8Aa";

// Main function to execute the logic
export default async function main() {
  // Set up the provider and signer
  const wallet = getWallet();

  // Define the chains configuration
  const arbitrum: OAppConfChain = {
    sendLib: "0x975bcD720be66659e3EB3C0e4F1866a3020E493A",
    eid: 30110,
    executor: "0x31CAe3B7fB82d847621859fb1585353c5720660D",
    l0dvn: "0x2f55C492897526677C5B68fb199ea31E2c126416",
    receiveLib: "0x7B9E184e07a6EE1aC23eAe0fe8D6Be2f663f05e6",
  };

  const zkSync: OAppConfChain = {
    sendLib: "0x07fD0e370B49919cA8dA0CE842B8177263c0E12c",
    eid: 30165,
    executor: "0x664e390e672A811c12091db8426cBb7d68D5D8A6",
    l0dvn: "0x620A9DF73D2F1015eA75aea1067227F9013f5C51",
    receiveLib: "0x04830f6deCF08Dec9eD6C3fCAD215245B78A59e1",
  };

  const receiveConfig = setReceiveConfigParams(zkSync, arbitrum);
  const sendConfig = setSendConfigParams(zkSync, arbitrum);

  const messageLibManager = IMessageLibManager__factory.connect(LZ_ENDPOINT, wallet);

  const block = await getProvider().getBlock("latest");

  const dao = DAO__factory.connect("0x21558950C9645702B4e8a9818C39e1911f5d12c7", wallet);

  const relay = ToucanRelay__factory.connect(RELAY_ADDRESS, wallet);
  const adminXChain = AdminXChain__factory.connect(ADMIN_X_CHAIN_ADDRESS, wallet);

  // Create actions
  const actions: IDAO.ActionStruct[] = [
    // skip the ones we've done already
    // {
    //   to: LZ_ENDPOINT,
    //   value: 0,
    //   data: messageLibManager.interface.encodeFunctionData("setReceiveLibrary", [
    //     receivingOApp,
    //     arbitrum.eid,
    //     zkSync.receiveLib,
    //     0,
    //   ]),
    // },
    // {
    //   to: LZ_ENDPOINT,
    //   value: 0,
    //   data: messageLibManager.interface.encodeFunctionData("setConfig", [receivingOApp, zkSync.receiveLib, config]),
    // },

    // relay is sender
    {
      to: LZ_ENDPOINT,
      value: 0,
      data: messageLibManager.interface.encodeFunctionData("setConfig", [relay.address, zkSync.sendLib, sendConfig]),
    },

    // oft bridge is a sender
    {
      to: LZ_ENDPOINT,
      value: 0,
      data: messageLibManager.interface.encodeFunctionData("setConfig", [OFT_TOKEN_BRIDGE, zkSync.sendLib, sendConfig]),
    },

    // adminXChain is a receiver
    {
      to: LZ_ENDPOINT,
      value: 0,
      data: messageLibManager.interface.encodeFunctionData("setConfig", [
        adminXChain.address,
        zkSync.receiveLib,
        receiveConfig,
      ]),
    },
  ];

  // Execute multisig proposal
  const msig = Multisig__factory.connect(MULTISIG_ADDRESS, wallet);

  const tx = await msig.createProposal("0x", actions, 0, true, true, 0, block.timestamp + 60 * 60);
  await tx.wait();
  console.log({ tx });
}
