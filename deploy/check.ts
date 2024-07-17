import { DAO__factory, ToucanRelay__factory } from "../typechain";
import { getWallet } from "./utils";

/**
 * VotingChain:
  chainName:  zkSync Era Mainnet
  eid:  30165
  lzEndpoint:  0xd07C30aF3Ff30D96BDc9c6044958230Eb797DDBF
  deployer:  0x7771c1510509C0dA515BDD12a57dbDd8C58E5363
DAO and Contracts
  dao:  0x653230a9E9507b6968B17190a53626bFe3E33146
  relay:  0xd946fC354f1C16877A7354C33c3d34762e065948
  adminXChain:  0x81F9b5d439Eac844c5641a37a1bC1fca5D39D62d
  bridge:  0xBcd2925a026f46745204ea6fA5Ebb0bE307DbA99
  token:  0xb017F75fE5f73759E8E64E811FA47A9c978714cA
ExecutionChain Data:
  chainName:  Arbitrum
  eid:  30110
  receiver:  0x2cb5e3A3C58B84ed322d4b2325f2fB196976aE31
  actionRelay:  0x75Ec043f0Ab838d274d544F147D8ae0f5De9d8E5
  adapter:  0x8D3439c61cfb233bdc2C009a0ea0585269F7Eb3B
 */
export default async function () {
  const wallet = getWallet();

  // check that the peers are set
  const relay = ToucanRelay__factory.connect("0xd946fC354f1C16877A7354C33c3d34762e065948", wallet);

  const peer = await relay.peers(30110);
  const buffer = await relay.buffer();
  const eid = await relay.dstEid();

  console.log({ peer, eid, buffer });
}
// https://zksync-era.l2scan.co/tx/0x7c62bd8ffca3d78fda5fcdf91c55c76147f898f783ced886e466a2195695660d?tab=logs
