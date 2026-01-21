import { ethers } from "ethers";
import { addressToBytes32, signature } from "../../../utils/utils.js";
import { User } from "../../auth/models/user.model.js";
import fs from "fs";
import { randomHookData } from "../../../utils/utils.js";
export const USDC_TO_USDB = async (user, amount) => {
  try {
    console.log("Inside helper");
    const USDCSpenderAddress = process.env.XReserve_Contract_USDC; //For Binance Chain (XReserve for USDC )
    const ERC20_ABI = [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function decimals() view returns (uint8)",
      "function allowance(address owner, address spender) view returns (uint256)",
    ];

    const userPrivKey = await User.findOne({
      where: { id: user.id },
      attributes: ["privateKey"],
    });

    const _provider = new ethers.JsonRpcProvider(process.env.BINANCE_RPC_URL);

    console.log("Provider:", _provider);

    const wallet = new ethers.Wallet(
      userPrivKey.privateKey, //Private Key
      _provider,
    );

    console.log("Wallet Address:", wallet);

    const token = new ethers.Contract(
      process.env.USDC_Contract, //Binance chain contract address for USDC
      ERC20_ABI,
      wallet,
    );

    console.log("Token Contract:", token);

    const decimals = await token.decimals();
    console.log("Token Decimals:", decimals);

    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

    console.log("Parsed Amount:", parsedAmount.toString());

    const tx = await token.approve(USDCSpenderAddress, parsedAmount.toString());

    console.log("Approval Transaction Hash:", tx);
    const receipt = await tx.wait();
    console.log("Approval Transaction Receipt:", receipt);
    const fullABI = JSON.parse(fs.readFileSync("./XReserve.json", "utf8"));

    // Filter only the depositToRemote function
    const depositToRemoteABI = fullABI.filter(
      (item) => item.type === "function" && item.name === "depositToRemote",
    );

    const depositToRemoteStringABI = depositToRemoteABI.map((func) => {
      const inputs = func.inputs.map((i) => i.type).join(", ");
      return `function ${func.name}(${inputs})`;
    });

    console.log(depositToRemoteStringABI);

    console.log("Spender Address:", USDCSpenderAddress);
    console.log("Amount to Deposit:", parsedAmount.toString());
    console.log("XReserve ABI:", depositToRemoteStringABI);
    const xreserve = new ethers.Contract(
      USDCSpenderAddress,
      depositToRemoteStringABI,
      wallet,
    );

    const remoteRecipient = addressToBytes32(wallet.address);

    console.log("Remote Recipient Bytes32:", remoteRecipient);

    const hookdata = await randomHookData();
    console.log("Hook Data:", hookdata);
    const xresTxIntent = await xreserve.depositToRemote(
      parsedAmount,
      0,
      remoteRecipient,
      process.env.USDC_CONTRACT, //Token Address USDC
      0,
      hookdata,
    );

    console.log("XReserve Deposit Transaction Intent:", xresTxIntent);

    const receiptXres = await xresTxIntent.wait();
    console.log("XReserve Deposit Transaction Receipt:", receiptXres);

    const _signature = await signature(
      process.env.ADMIN_PRIVATE_KEY,
      xresTxIntent.data,
    );

    //Minting USBD

    const USDB_ABI = [
      "function mintByIntent(bytes intentCalldata, bytes signature) external",
    ];

    const usdbProvider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const usdbWallet = new ethers.Wallet(
      userPrivKey.privateKey, //Private Key
      usdbProvider,
    );
    const usdBToken = new ethers.Contract(
      process.env.USDB_CONTRACT,
      USDB_ABI,
      usdbWallet,
    );

    const mintUSDB = await usdBToken.mintByIntent(
      xresTxIntent.data,
      _signature,
    );

    console.log("USDB Mint Transaction Hash:", mintUSDB.hash);
    const waitMint = await mintUSDB.wait();
    console.log("USDB Mint Transaction Receipt:", waitMint);

    return {
      txHash: waitMint.hash,
      intent: mintUSDB.data,
      amount: amount,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
