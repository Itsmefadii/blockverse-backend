import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import { Tokens } from "../modules/transaction/model/token.model.js";
import { Wallet, keccak256, getBytes } from "ethers";
import crypto from "crypto";

export const apiResponse = (
  success,
  message,
  data = null,
  code = 200,
  type = "success",
) => {
  return {
    type,
    success,
    code,
    message,
    data,
  };
};

export const signJWT = async (data) => {
  return jwt.sign(data.toJSON(), process.env.JWT_SECRET, { expiresIn: "1d" });
};

export const verifyAccessToken = async (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return reject(new Error("Token expired"));
        }
        return reject(new Error("Invalid token"));
      }
      resolve(decoded);
    });
  });
};

export const ethProvider = new ethers.JsonRpcProvider(process.env.RPC_URL);
export const bnbProvider = new ethers.JsonRpcProvider(process.env.BINANCE_RPC_URL);

export const getTokenBalance = async (walletAddress) => {
  try {
    const token = await Tokens.findAll();

    const ERC20_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ];

    const balances = [];
    let totalBalance = 0;

    for (let i = 0; i < token.length; i++) {
      const _provider = ethProvider;

      console.log("Fetching balance for token:", token[i].tokenName);
      const usdcContract = new ethers.Contract(
        token[i].tokenAddress,
        ERC20_ABI,
        _provider,
      );

      const balance = await usdcContract.balanceOf(walletAddress);
      const decimals = await usdcContract.decimals();

      const formattedBalance = ethers.formatUnits(balance, decimals);

      totalBalance += Number(formattedBalance);
      balances.push({
        tokenName: token[i].tokenName,
        balance: formattedBalance,
      });
    }

    return { totalBalance: `$${totalBalance.toFixed(2)}`, balances };
  } catch (error) {
    throw new Error(error.message);
  }
};

export const addressToBytes32 = (address) => ethers.zeroPadValue(address, 32);

export const signature = async (key, intent) => {
  try {
    const wallet = new Wallet(key);

    // remove selector
    const paramsHex = "0x" + intent.slice(10);
    const paramsBytes = getBytes(paramsHex);

    // HASH FIRST
    const paramsHash = keccak256(paramsBytes);

    // SIGN THE HASH (THIS IS THE FIX)
    const signature = await wallet.signMessage(getBytes(paramsHash));

    return signature;
  } catch (error) {
    throw new Error(`Signature generation failed: ${error.message}`);
  }
};

export async function randomHookData() {
  const randomBytes = crypto.randomBytes(32); // 32 bytes = 64 hex chars
  const hookData = "0x" + randomBytes.toString("hex");

  return hookData;
}

//This function is for USDB -> USDC or Local Token -> USDB || USDC
export const _signature = async (privateKey, data) => {
  const wallet = new Wallet(privateKey);

  const paramsBytes = getBytes(data);

  // HASH FIRST
  const paramsHash = keccak256(paramsBytes);

  // SIGN THE HASH (THIS IS THE FIX)
  const signature = await wallet.signMessage(getBytes(paramsHash));

  console.log("Signer:", wallet.address);
  console.log("Params hash:", paramsHash);
  console.log("Signature:", signature);

  return signature;
}