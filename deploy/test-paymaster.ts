import { ethers } from "ethers";
import { GeneralPaymaster } from "../typechain";
import { deployContract, getWallet } from "./utils";

const toucanRelayAddress = "0x81b354B610E6F5E117f42Dae7e1F654440ACc7c1";

export default async function () {
  // deploy the mock paymaster and erc20
  const wallet = getWallet(process.env.WALLET_PRIVATE_KEY);

  const paymaster = (await deployContract(
    "contracts/mocks/paymasters/GeneralPaymaster.sol:GeneralPaymaster",
    [toucanRelayAddress],
    {
      wallet,
    }
  )) as GeneralPaymaster;

  // send the paymaster some cash
  const tx = await wallet.sendTransaction({
    to: paymaster.address,
    value: ethers.utils.parseEther("0.001"),
  });

  await tx.wait();

  // get the paymaster balance
  const balance = await wallet.provider.getBalance(paymaster.address);

  console.log("Paymaster address: ", paymaster.address);
  console.log("Paymaster balance: ", balance.toString());
}

/*
 * Paymaster address:  0xBB6c2FB50D1d61d0e48E1d6a2c80df51393a29B5
 * Token address:  0xC35cEB7afa10290846c805e3a50CA76B9AAF984f
 * Paymaster balance:  50000000000000000
 */
