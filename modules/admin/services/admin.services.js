import { ethers } from "ethers";
import { Tokens } from "../../transaction/model/token.model.js";
import { ethProvider } from "../../../utils/utils.js";

export const registerRemoteDomainService = async (req) => {
  try {
    if (req.user.role !== "admin") {
      throw new Error("Unauthorized Access");
    }
    const { name, tokenName, tokenAddress, remoteDomain } = req.body;

    const addToken = await Tokens.create({
      names: name,
      tokenName,
      tokenAddress,
      isLocalToken: 1,
      remoteDomain,
      tokenType: "LOCAL"
    });

    if (!addToken) {
      throw new Error("Error in adding remote domain");
    }

    return addToken;
  } catch (error) {
    throw new Error(error);
  }
};

export const reserveBalanceService = async (req) => {
  try {
    if (req.user.role !== "admin") {
      throw new Error("Unauthorized Access");
    }
    const ERC_20_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ];

    // const bsc_provider = new ethers.JsonRpcProvider(
    //   process.env.RPC_URL,
    // );

    // if (!bsc_provider) {
    //   throw new Error("Error in bsc provider");
    // }

    const usdcContract = new ethers.Contract(
      process.env.USDC_CONTRACT,
      ERC_20_ABI,
      ethProvider,
    );

    if (!usdcContract) {
      throw new Error("Error in connecting to the USDC Contract");
    }

    const usdcBalance = await usdcContract.balanceOf(
      process.env.USDC_XReserve_Vault_Address,
    );

    if (!usdcBalance && usdcBalance !== 0n) {
      throw new Error("Unable to fetch USDC balance");
    }

    const decimals = await usdcContract.decimals();
    const USDC_formattedBalance = ethers.formatUnits(usdcBalance, decimals);

    const usdbContract = new ethers.Contract(
      process.env.USDB_CONTRACT,
      ERC_20_ABI,
      ethProvider,
    );

    if (!usdbContract) {
      throw new Error("Error in connecting to the USDB Contract");
    }

    const usdbBalance = await usdbContract.balanceOf(
      process.env.USDB_XReserve_Vault,
    );

    if (!usdbBalance && usdbBalance !== 0n) {
      throw new Error("Unable to fetch USDB balance");
    }

    const usdbDecimals = await usdbContract.decimals();

    const usdb_Formatted_balance = ethers.formatUnits(
      usdbBalance,
      usdbDecimals,
    );

    const localTokens = await Tokens.findAll({
      where: { isLocalToken: 1 },
      attributes: ["tokenAddress", "chainAddress", "tokenName"],
    });

    const localTokenABI = [
      "function totalSupply() view returns (uint256)",
      "function decimals() view returns (uint8)",
    ];

    let localTokenTotalSupply = [];

    for (let i = 0; i < localTokens.length; i++) {
      const localTokenContract = new ethers.Contract(
        localTokens[i].tokenAddress,
        localTokenABI,
        ethProvider,
      );

      const totalSupply = await localTokenContract.totalSupply();
      console.log(totalSupply);

      const localTokenDecimals = await localTokenContract.decimals();

      const usdb_Formatted_balance = ethers.formatUnits(
        totalSupply,
        localTokenDecimals,
      );

      localTokenTotalSupply.push({
        tokenName: localTokens[i].tokenName,
        totalSupply: usdb_Formatted_balance,
      });
    } 
    return {
      USDC_XReserve_Balance: USDC_formattedBalance,
      USDB_XReserve_Balance: usdb_Formatted_balance,
      localTokenTotalSupply,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
