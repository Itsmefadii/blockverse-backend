import { ethers } from "ethers";
import { User } from "../../auth/models/user.model.js";
import { Tokens } from "../model/token.model.js";
import { USDC_TO_USDB } from "../helperFunction/usdcToUsdb.helperFunctions.js";
import { USDB_TO_LOCAL } from "../helperFunction/usdbToLocal.helperFunction.js";

export const transferTokenService = async (req) => {
  try {
    console.log("Inside transferTokenService");

    const { tokenId, toAddress, amount } = req.body;

    if (amount === "0") {
      throw new Error("Enter Valid Amount");
    }

    const privateKey = await User.findOne({
      where: { id: req.user.id },
      attributes: ["privateKey"],
    });

    console.log("Private Key:", privateKey);

    const tokenAddress = await Tokens.findOne({
      where: { id: tokenId },
      attributes: ["tokenAddress", "chainAddress"],
    });

    console.log("Token Address:", tokenAddress);
    if (!tokenAddress) {
      throw new Error("Invalid token ID");
    }

    const _provider = new ethers.JsonRpcProvider(tokenAddress.chainAddress);
    // return tokenAddress;
    const wallet = new ethers.Wallet(privateKey.privateKey, _provider);

    const ERC20_ABI = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address owner) view returns (uint256)",
    ];

    const token = new ethers.Contract(
      tokenAddress.tokenAddress,
      ERC20_ABI,
      wallet,
    );

    const decimals = await token.decimals();

    const _amount = ethers.parseUnits(amount.toString(), decimals);

    const balance = await token.balanceOf(wallet.address);

    console.log("Balance: ", Number(balance));

    if (balance < _amount) {
      throw new Error(
        `Insufficient balance. Available: ${ethers.formatUnits(
          balance,
          decimals,
        )}`,
      );
    }

    console.log("Token Contract:", token);

    const txIntent = await token.transfer.populateTransaction(
      toAddress,
      _amount,
    );

    console.log("Transaction Intent:", txIntent);

    const tx = await wallet.sendTransaction(txIntent);

    console.log("Transaction Hash:", tx.hash);

    const receipt = await tx.wait();

    console.log("Transaction Receipt:", receipt);

    return {
      txHash: receipt.hash,
      intent: txIntent.data,
      to: req.body.toAddress,
      amount: req.body.amount,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const transactionApprovalService = async (req) => {
  try {
    const user = req.user;

    const { amount, tokenId, sourceId } = req.body;

    let usdcToUsdb;
    let usdbToLocal;

    //source id is flag of USDB TO LOCAL ------------ Source Id will always be 2
    if (sourceId === 2) {
      usdbToLocal = await USDB_TO_LOCAL(user, amount, tokenId);
      if (!usdbToLocal) {
        throw new Error("Unable To Mint Local Token");
      }

      return {data: usdbToLocal}
    }

    //2 is the id usdb which means we have to convert USDC to USDB
    if (tokenId === 2) {
      console.log("INSIDE USDC TO USDB");
      usdcToUsdb = await USDC_TO_USDB(user, amount);
    }

    //1 is the id of USDC and 2 is the id usdb which means we have to convert USDC to Local Token
    if (tokenId !== 1 && tokenId !== 2) {
      usdcToUsdb = await USDC_TO_USDB(user, amount);
      if (!usdcToUsdb) {
        throw new Error("Unable to mint USDB");
      }
      usdbToLocal = await USDB_TO_LOCAL(user, amount, tokenId);
      if (!usdbToLocal) {
        throw new Error("Unable To Mint Local Token");
      }
    }

    if (usdcToUsdb) {
      return { data: usdcToUsdb };
    }
    if (usdbToLocal || (usdcToUsdb && usdbToLocal)) {
      return { data: usdbToLocal };
    }
  } catch (error) {
    throw new Error(error.message);
  }
};
