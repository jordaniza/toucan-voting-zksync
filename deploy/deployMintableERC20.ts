import { deployContract, getWallet } from "./utils";

export default async function () {
  const pk = process.env.WALLET_PRIVATE_KEY;
  if (!pk) {
    throw new Error("WALLET_PRIVATE_KEY env variable is required");
  }

  const deployerWallet = getWallet(pk);

  const token = await deployContract("MyERC20", [], {
    wallet: deployerWallet,
  });
}
