import { addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { DAO, IDAO } from "../../typechain";
import { ExecutionChain, VotingChain, mockApplyInstallationParams, mockApplyUninstallationParams } from "./base";

export async function executionActions(chain: ExecutionChain, votingChain: VotingChain): Promise<IDAO.ActionStruct[]> {
  const actions: IDAO.ActionStruct[] = new Array(6);

  // action 0: apply the tokenVoting installation
  actions[0] = {
    to: chain.base.psp.address,
    value: 0,
    data: chain.base.psp.interface.encodeFunctionData("applyInstallation", [
      chain.base.dao.address,
      mockApplyInstallationParams(chain.voting.address, chain.votingPermissions),
    ]),
  };

  // action 1: apply the receiver installation
  actions[1] = {
    to: chain.base.psp.address,
    value: 0,
    data: chain.base.psp.interface.encodeFunctionData("applyInstallation", [
      chain.base.dao.address,
      mockApplyInstallationParams(chain.receiver.address, chain.receiverPermissions),
    ]),
  };

  // action 2: set the peers for receiver
  actions[2] = {
    to: chain.receiver.address,
    value: 0,
    data: chain.receiver.interface.encodeFunctionData("setPeer", [
      votingChain.base.eid,
      addressToBytes32(votingChain.relay.address),
    ]),
  };

  // action 3: set the peers for actionRelay
  actions[3] = {
    to: chain.actionRelay.address,
    value: 0,
    data: chain.actionRelay.interface.encodeFunctionData("setPeer", [
      votingChain.base.eid,
      addressToBytes32(votingChain.adminXChain.address),
    ]),
  };

  // action 4: set the peers for adapter
  actions[4] = {
    to: chain.adapter.address,
    value: 0,
    data: chain.adapter.interface.encodeFunctionData("setPeer", [
      votingChain.base.eid,
      addressToBytes32(votingChain.bridge.address),
    ]),
  };

  // action 5: uninstall the admin plugin
  actions[5] = {
    to: chain.base.psp.address,
    value: 0,
    data: chain.base.psp.interface.encodeFunctionData("applyUninstallation", [
      chain.base.dao.address,
      mockApplyUninstallationParams(chain.base.admin.address, chain.base.adminUninstallPermissions),
    ]),
  };

  return await wrapGrantRevokeRoot(chain.base.dao, chain.base.psp.address, actions);
}

export async function votingActions(chain: VotingChain, executionChain: ExecutionChain): Promise<IDAO.ActionStruct[]> {
  const actions: IDAO.ActionStruct[] = new Array(6);

  // action 0: apply the toucanRelay installation
  actions[0] = {
    to: chain.base.psp.address,
    value: 0,
    data: chain.base.psp.interface.encodeFunctionData("applyInstallation", [
      chain.base.dao.address,
      mockApplyInstallationParams(chain.relay.address, chain.toucanRelayPermissions),
    ]),
  };

  // action 1: apply the adminXChain installation
  actions[1] = {
    to: chain.base.psp.address,
    value: 0,
    data: chain.base.psp.interface.encodeFunctionData("applyInstallation", [
      chain.base.dao.address,
      mockApplyInstallationParams(chain.adminXChain.address, chain.adminXChainPermissions),
    ]),
  };

  // action 2: set the peers for relay
  actions[2] = {
    to: chain.relay.address,
    value: 0,
    data: chain.relay.interface.encodeFunctionData("setPeer", [
      executionChain.base.eid,
      addressToBytes32(executionChain.receiver.address),
    ]),
  };

  // action 3: set the peers for adminXChain
  actions[3] = {
    to: chain.adminXChain.address,
    value: 0,
    data: chain.adminXChain.interface.encodeFunctionData("setPeer", [
      executionChain.base.eid,
      addressToBytes32(executionChain.actionRelay.address),
    ]),
  };

  // action 4: set the peers for bridge
  actions[4] = {
    to: chain.bridge.address,
    value: 0,
    data: chain.bridge.interface.encodeFunctionData("setPeer", [
      executionChain.base.eid,
      addressToBytes32(executionChain.adapter.address),
    ]),
  };

  // action 5: uninstall the admin plugin
  actions[5] = {
    to: chain.base.psp.address,
    value: 0,
    data: chain.base.psp.interface.encodeFunctionData("applyUninstallation", [
      chain.base.dao.address,
      mockApplyUninstallationParams(chain.base.admin.address, chain.base.adminUninstallPermissions),
    ]),
  };

  return await wrapGrantRevokeRoot(chain.base.dao, chain.base.psp.address, actions);
}

async function wrapGrantRevokeRoot(dao: DAO, psp: string, actions: IDAO.ActionStruct[]): Promise<IDAO.ActionStruct[]> {
  const ROOT_PERMISSION_ID = await dao.ROOT_PERMISSION_ID();
  const len = actions.length;
  const wrappedActions: IDAO.ActionStruct[] = new Array(len + 2);

  // Action to grant ROOT permission
  wrappedActions[0] = {
    to: dao.address,
    value: 0,
    data: dao.interface.encodeFunctionData("grant", [dao.address, psp, ROOT_PERMISSION_ID]),
  };

  // Copy existing actions
  for (let i = 0; i < len; i++) {
    wrappedActions[i + 1] = actions[i];
  }

  // Action to revoke ROOT permission
  wrappedActions[len + 1] = {
    to: dao.address,
    value: 0,
    data: dao.interface.encodeFunctionData("revoke", [dao.address, psp, ROOT_PERMISSION_ID]),
  };

  return wrappedActions;
}
