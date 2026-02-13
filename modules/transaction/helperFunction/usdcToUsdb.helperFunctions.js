import { ethers } from "ethers";
import {
  addressToBytes32,
  bnbProvider,
  ethProvider,
  signature,
} from "../../../utils/utils.js";
import { User } from "../../auth/models/user.model.js";
import fs from "fs";
import { randomHookData } from "../../../utils/utils.js";
import { Tokens } from "../model/token.model.js";
export const USDC_TO_USDB = async (user, amount, to) => {
  try {
    console.log("Inside helper");
    const USDCSpenderAddress = process.env.XReserve_Contract_USDC;
    const ERC20_ABI = [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function decimals() view returns (uint8)",
      "function allowance(address owner, address spender) view returns (uint256)",
    ];

    const userPrivKey = await User.findOne({
      where: { id: user.id },
      attributes: ["privateKey"],
    });

    const toRemoteDomain = await Tokens.findOne({
      where: { id: to },
      attributes: ["remoteDomain"],
    });

    console.log("toRemoteDomain: ", toRemoteDomain.remoteDomain);
    // const _provider = new ethers.JsonRpcProvider(process.env.BINANCE_RPC_URL);

    // console.log("Provider:", _provider);

    // const wallet = new ethers.Wallet(
    //   userPrivKey.privateKey, //Private Key
    //   bnbProvider,
    // );

    const wallet = new ethers.Wallet(
      userPrivKey.privateKey, //Private Key
      ethProvider,
    );

    console.log("Wallet Address:", wallet);

    const token = new ethers.Contract(
      process.env.USDC_Contract, //Binance chain contract address for USDC
      ERC20_ABI,
      wallet,
    );

    console.log("Token Contract:", token);

    const decimals = 6;
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

    // const decimals = await token.decimals();
    // console.log("Token Decimals:", decimals);

    // const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

    console.log("Parsed Amount:", parsedAmount.toString());

    const tx = await token.approve(USDCSpenderAddress, parsedAmount.toString());

    console.log("Approval Transaction Hash:", tx);
    const receipt = await tx.wait();
    console.log("Approval Transaction Receipt:", receipt);
    // const fullABI = JSON.parse(fs.readFileSync("./XReserve.json", "utf8"));

    // // Filter only the depositToRemote function
    // const depositToRemoteABI = fullABI.filter(
    //   (item) => item.type === "function" && item.name === "depositToRemote",
    // );

    // const depositToRemoteStringABI = depositToRemoteABI.map((func) => {
    //   const inputs = func.inputs.map((i) => i.type).join(", ");
    //   return `function ${func.name}(${inputs})`;
    // });

     const depositToRemoteStringABI = [
      "function depositToRemote(uint256 value, uint32 remoteDomain, bytes32 remoteRecipien, address localToken, uint256 maxFee, bytes hookData) external",
    ];

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
    console.log("USDC_CONTRACT:", process.env.USDC_CONTRACT);

    const hookdata = await randomHookData();
    console.log("Hook Data:", hookdata);

    console.log("Depositing to remote...");
    console.log(
      parsedAmount,
      toRemoteDomain.remoteDomain,
      remoteRecipient,
      process.env.USDC_CONTRACT,
      100,
      hookdata,
    );
    const xresTxIntent = await xreserve.depositToRemote(
      parsedAmount,
      toRemoteDomain.remoteDomain,
      remoteRecipient,
      process.env.USDC_CONTRACT,
      100,
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

    // const usdbProvider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const usdbWallet = new ethers.Wallet(
      userPrivKey.privateKey, //Private Key
      ethProvider,
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
      flow: "USDC To USDB",
      isMint: true,
      txHash: waitMint.hash,
      intent: mintUSDB.data,
      signature: _signature,
      amount: amount,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
