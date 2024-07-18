pragma solidity ^0.8.17;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyERC20 is ERC20 {
    constructor() ERC20("zkTestToken", "zkTT") {}

    function mint() external {
        _mint(msg.sender, 1000 ether);
    }
}
