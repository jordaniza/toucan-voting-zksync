pragma solidity ^0.8.20;

import {EndpointV2Mock} from "@layerzerolabs/test-devtools-evm-hardhat/contracts/mocks/EndpointV2Mock.sol";

contract EndpointV2LocalMock is EndpointV2Mock {
    constructor(uint32 eid) EndpointV2Mock(eid) {}
}
