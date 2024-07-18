import { DAO__factory, Multisig__factory, ToucanRelay__factory } from "../typechain";
import { getWallet } from "./utils";

/**

  VotingChain:
  chainName:  zkSync Era Mainnet
  eid:  30165
  lzEndpoint:  0xd07C30aF3Ff30D96BDc9c6044958230Eb797DDBF
  deployer:  0x7771c1510509C0dA515BDD12a57dbDd8C58E5363
DAO and Contracts
  dao:  0x21558950C9645702B4e8a9818C39e1911f5d12c7
  relay:  0x81b354B610E6F5E117f42Dae7e1F654440ACc7c1
  adminXChain:  0x7E10952B1eB3cfdEe715D335C028545b4E23C8Aa
  bridge:  0xAB1b5e2B7feF10231d6B1B60893af0C70fBAB7a0
  token:  0xB09E7b672A0fE6f92E9ae74141B048fCF0f8227C
  multisig:  0xf4999519a41599bd61dfaBB276F077CdddD7f38a
ExecutionChain Data:
  chainName:  Arbitrum
  eid:  30110
  receiver:  0xCb1838Fcb8402a0857A77fBd66ffd25012683026
  actionRelay:  0x2a40e813E084045574FA631848d3241Fb5eb9D7B
  adapter:  0x68dfCa0806aA79048eAab0033bebe6F02BF22685
*/

export default async function () {
  const wallet = getWallet();

  // check that the peers are set
  const relay = ToucanRelay__factory.connect("0x81b354B610E6F5E117f42Dae7e1F654440ACc7c1", wallet);

  const peer = await relay.peers(30110);
  const buffer = await relay.buffer();
  const eid = await relay.dstEid();

  console.log({ peer, eid, buffer });

  // check the mutltisig:
  const msig = Multisig__factory.connect("0xf4999519a41599bd61dfaBB276F077CdddD7f38a", wallet);

  const isMultisig = await msig.UPDATE_MULTISIG_SETTINGS_PERMISSION_ID();

  console.log({ isMultisig });

  const isDeployerMember = await msig.isMember(wallet.address);

  console.log({ isDeployerMember });

  const dao = DAO__factory.connect("0x21558950C9645702B4e8a9818C39e1911f5d12c7", wallet);
  const executePermission = await dao.EXECUTE_PERMISSION_ID();
  const isExecuteOnDao = await dao.isGranted(dao.address, msig.address, executePermission, "0x");

  console.log({ isExecuteOnDao });
}
// https://zksync-era.l2scan.co/tx/0x7c62bd8ffca3d78fda5fcdf91c55c76147f898f783ced886e466a2195695660d?tab=logs
