import { ethers } from "ethers";
import { LOCAL_RICH_WALLETS, deployContract, getWallet } from "../deploy/utils";
import { GeneralPaymaster, MyERC20 } from "../typechain";
import { expect } from "chai";
import { utils } from "zksync-ethers";

describe("Testing paymasters", () => {
  const wallet = getWallet(LOCAL_RICH_WALLETS[0].privateKey);

  it.only("works", async () => {
    const token = (await deployContract("MyERC20", [], {
      wallet,
    })) as MyERC20;

    const paymaster = (await deployContract(
      "contracts/mocks/paymasters/GeneralPaymaster.sol:GeneralPaymaster",
      [token.address],
      {
        wallet,
      }
    )) as GeneralPaymaster;

    // send the paymaster some cash
    const tx = await wallet.sendTransaction({
      to: paymaster.address,
      value: ethers.utils.parseEther("0.1"),
    });

    await tx.wait();

    // dervive a random wallet
    const randomWallet = getWallet("8a2f0cc09914543d2b7b43204b62c25ae748207b79a7db770c748c95480eb40e");

    expect(randomWallet.address).to.eq("0xc878c3A2bC126cffC7af29F30eB0D8e52d6d3654");

    // mint tokens w. the paymaster flow
    const sponsored = await token.connect(randomWallet).mint({
      customData: {
        paymasterParams: utils.getPaymasterParams(paymaster.address, {
          type: "General",
          innerInput: new Uint8Array(),
        }),
      },
    });

    await sponsored.wait();

    // check the balance
    const balance = await token.balanceOf(randomWallet.address);
    expect(balance.eq(ethers.utils.parseEther("1000"))).to.be.true;
  });
});
