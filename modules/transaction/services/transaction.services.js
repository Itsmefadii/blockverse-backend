import { ethers } from "ethers";
import { User } from "../../auth/models/user.model.js";
import { Tokens } from "../model/token.model.js";
import { USDC_TO_USDB } from "../helperFunction/usdcToUsdb.helperFunctions.js";
import { USDB_TO_LOCAL } from "../helperFunction/usdbToLocal.helperFunction.js";
import { Wallet, keccak256, getBytes } from "ethers";
import { AbiCoder } from "ethers";
import {
  addressToBytes32,
  bnbProvider,
  ethProvider,
  signature,
} from "../../../utils/utils.js";
import { USDB_TO_USDC } from "../helperFunction/usdbToUsdc.helperFunction.js";
import { Local_TO_USDB } from "../helperFunction/localToUsdb.helperFunction.js";
import { Attestations } from "../model/attestation.model.js";

export const transferTokenService = async (req) => {
  try {
    console.log("Inside transferTokenService");
    console.log("Request Body:", req.body);
    console.log("Request Body:", req.query.token);

    const { amount } = req.body;

    // const { tokenId, toAddress, amount } = req.body;

    if (amount == 0) {
      throw new Error("Enter Valid Amount");
    }

    if (req.query.token === "eth") {
      console.log("Transferring ETH to other wallet");
      const ethToOtherWallet1 = await ethToOtherWallet(req);
      if (!ethToOtherWallet1) {
        throw new Error("Transfer From ETH to Other Wallet Failed");
      }
      return { data: ethToOtherWallet1 };
    }

     const { tokenId, toAddress } = req.body;

    const privateKey = await User.findOne({
      where: { id: req.user.id },
      attributes: ["privateKey"],
    });

    console.log("Private Key:", privateKey);

    const tokenAddress = await Tokens.findOne({
      where: { id: tokenId },
      attributes: ["tokenAddress"],
    });

    console.log("Token Address:", tokenAddress);
    if (!tokenAddress) {
      throw new Error("Invalid token ID");
    }

    const _provider = ethProvider;
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

export const transactionApprovalService = async (req, _user, _amount, _from, _to) => {
  try {
    console.log("Inside transactionApprovalService");
    
    const user = req?.user || _user;
    // console.log("Req user: ",req.user)
    console.log("_user: ", _user);

    let amount
    let from;
    let to;
    if(!req?.body){
      amount = _amount.toString();
      to = _to;
      from = _from
    } else {
      amount = req.body.amount;
      from = req.body.from;
      to = req.body.to;
    }
    // const { amount, from, to } = req.body;



    if (amount == 0) {
      throw new Error("Invalid Amount");
    }

    let usdcToUsdb;
    let usdbToLocal;
    let usdbToUsdc;
    let localToUsdb;
    const transactionData = [];

    const fromTokenType = await Tokens.findOne({
      where: {
        id: from,
      },
      attributes: ["tokenName", "tokenType"],
    });

    const toTokenType = await Tokens.findOne({
      where: {
        id: to,
      },
      attributes: ["tokenName", "tokenType"],
    });
    console.log(
      "fromTokenType:",
      fromTokenType.tokenType,
      "toTokenType: ",
      toTokenType.tokenType,
    );

    if (
      fromTokenType.tokenType === "USDC" &&
      toTokenType.tokenType === "USDB"
    ) {
      usdcToUsdb = await USDC_TO_USDB(user, amount, to);
      transactionData.push(usdcToUsdb);
    }

    if (
      fromTokenType.tokenType === "USDB" &&
      toTokenType.tokenType === "LOCAL"
    ) {
      usdbToLocal = await USDB_TO_LOCAL(user, amount, to);
      transactionData.push(usdbToLocal);
    }

    if (
      fromTokenType.tokenType === "USDC" &&
      toTokenType.tokenType === "LOCAL"
    ) {
      const tokedId = await Tokens.findOne({
        where: {
          tokenType: "USDB",
        },
        attributes: ["id"],
      });
      usdcToUsdb = await USDC_TO_USDB(user, amount, tokedId.id);
      transactionData.push(usdcToUsdb);
      usdbToLocal = await USDB_TO_LOCAL(user, amount, to);
      transactionData.push(usdbToLocal);
    }

    if (
      fromTokenType.tokenType === "LOCAL" &&
      toTokenType.tokenType === "USDC"
    ) {
      console.log("Conversion from LOCAL to USDC initiated");
      localToUsdb = await Local_TO_USDB(user, amount, from);
      // if (!localToUsdb) {
      //   throw new Error("Conversion from Local to USDB failed");
      // }
      transactionData.push(localToUsdb);
      console.log("Conversion from USDB to USDC initiated");
      usdbToUsdc = await USDB_TO_USDC(user, amount);
      transactionData.push(usdbToUsdc);
    }

    if (
      fromTokenType.tokenType === "LOCAL" &&
      toTokenType.tokenType === "USDB"
    ) {
      console.log("Conversion from LOCAL to USDC initiated");
      localToUsdb = await Local_TO_USDB(user, amount, from);
      if (!localToUsdb) {
        throw new Error("Conversion from Local to USDB failed");
      }
      transactionData.push(localToUsdb);
      // console.log("Conversion from USDB to USDC initiated");
      // usdbToUsdc = await USDB_TO_USDC(user, amount);
    }

    if (
      fromTokenType.tokenType === "USDB" &&
      toTokenType.tokenType === "USDC"
    ) {
      usdbToUsdc = await USDB_TO_USDC(user, amount);
      transactionData.push(usdbToUsdc);
    }

    if (
      fromTokenType.tokenType === "LOCAL" &&
      toTokenType.tokenType === "LOCAL"
    ) {
      console.log("Conversion from LOCAL to LOCAL initiated");

      localToUsdb = await Local_TO_USDB(user, amount, from);
      if (!localToUsdb) {
        throw new Error("Conversion From Local To USDB Failed");
      }
      transactionData.push(localToUsdb);
      usdbToLocal = await USDB_TO_LOCAL(user, amount, to);
      if (!usdbToLocal) {
        throw new Error("Conversion From USDB to Local Failed");
      }
      transactionData.push(usdbToLocal);
    }

    console.log("Transaction Data: ", transactionData);

    const attestations = await Attestations.create({
      transactionFlow: `${fromTokenType.tokenName} to ${toTokenType.tokenName}`,
      transactionData: transactionData,
      userId: req?.user?.id || _user.id,
      attestedBy: process.env.ADMIN_ADDRESS,
    });

    return attestations;
    // if (usdcToUsdb) {
    //   return { data: usdcToUsdb };
    // }
    // if (usdbToLocal || (usdcToUsdb && usdbToLocal)) {
    //   return { data: usdbToLocal };
    // }
    // if (usdbToUsdc) {
    //   return { data: usdbToUsdc };
    // }
    // if(localToUsdb){
    //   return { data: localToUsdb.withdraw };
    // }
  } catch (error) {
    throw new Error(error.message);
  }
};

export const ethBnbTransferService = async (req) => {
  try {
    const { recieverAddress, amount, token } = req.body;

    let provider;

    if (token === "eth") {
      provider = ethProvider;
    }
    if (token === "bnb") {
      provider = bnbProvider;
    }

    const { id } = req.user;

    const dbUser = await User.findOne({
      where: { id },
      attributes: ["privateKey"],
    });

    const senderWallet = new ethers.Wallet(dbUser.privateKey, provider);

    const tx = {
      to: recieverAddress,
      value: ethers.parseEther(amount),
    };

    const sendTx = await senderWallet.sendTransaction(tx);

    const txAwait = await sendTx.wait();

    console.log(txAwait);

    return txAwait;
  } catch (error) {
    throw new Error(error);
  }
};

export const testingConversionService = async (req) => {
  try {
    const walletAddress = req.user.walletAddress;
    const privateKey = await User.findOne({
      where: {
        id: req.user.id,
      },
      attributes: ["privateKey"],
    });

    const formatWalletAddress = addressToBytes32(walletAddress);

    const burningAbi = [
      "function burnForUSDC(uint256 amount, uint32 destinationDomain, bytes32 destinationRecipient)",
      "event BurnForUSDC(bytes32 burner, bytes32 localToken, uint32 remoteDomain, uint256 amount, uint32 destinationDomain, bytes32 destinationRecipient, bytes hookData)",
    ];

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // 2️⃣ Signer (WRITE)
    const signer = new ethers.Wallet(
      privateKey.privateKey, // 🔑 MUST be backend wallet private key
      provider,
    );
    console.log("USDB_Address: ", process.env.USDB_CONTRACT);
    const burnContract = new ethers.Contract(
      process.env.USDB_CONTRACT,
      burningAbi,
      signer,
    );
    console.log("burnContract: ", burnContract);

    const amountInUSDC = "1";
    const parsedAmount = ethers.parseUnits(amountInUSDC, 6);

    const burningTransaction = await burnContract.burnForUSDC(
      parsedAmount,
      "0",
      formatWalletAddress,
    );

    const burningTransactionWait = await burningTransaction.wait();
    console.log("burningTransactionWait: ", burningTransactionWait);
    console.log("burningTransactionWait Hash: ", burningTransactionWait.hash);

    const parsedLogs = burningTransactionWait.logs
      .map((log) => {
        try {
          return burnContract.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    console.log("parsedLogs: ", parsedLogs);

    // 🧠 Find your specific event
    const burnEvent = parsedLogs.find((e) => e.name === "BurnForUSDC");

    const coder = AbiCoder.defaultAbiCoder();

    // Get event inputs (types)
    const eventInputs = burnEvent.fragment.inputs.map((i) => i.type);

    // Get values
    const eventValues = burnEvent.args;

    // ABI ENCODE (🔥 this is what you want)
    const encodedEventData = coder.encode(eventInputs, eventValues);

    console.log(encodedEventData);

    console.log("burnEvent: ", burnEvent);

    const _signature1 = await _signature(
      process.env.ADMIN_PRIVATE_KEY,
      encodedEventData,
    );

    //ABI of XReserve ---------- USDC
    const withdrawAbi = [
      "function withdraw(address withdrawToken, bytes attestationPayload, bytes signature)",
    ];

    console.log("WITHDRAW_CONTRACT: ", withdrawAbi);
    console.log("_signature1: ", _signature1);

    const withdrawContract = new ethers.Contract(
      process.env.XReserve_Contract_USDC,
      withdrawAbi,
      signer,
    );

    const withdrawTransaction = await withdrawContract.withdraw(
      process.env.USDC_ADDRESS,
      encodedEventData,
      _signature1,
    );

    console.log("withdrawTransaction: ", withdrawTransaction);

    const withdrawTransactionWait = await withdrawTransaction.wait();

    console.log("withdrawTransactionWait: ", withdrawTransactionWait);

    return {
      txHash: burningTransactionWait.hash,
      event: encodedEventData,
      signature: _signature1,
      withdraw: withdrawTransactionWait.hash,
    };
  } catch (error) {
    console.log(error);
  }
};

const _signature = async (privateKey, data) => {
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
};

const ethToOtherWallet = async (req) => {
  console.log("req.user", req.user);

  const privateKey = await User.findOne({
    where: { id: req.user.id },
    attributes: ["privateKey"],
  });

  console.log("Private Key:", privateKey.privateKey);

  let provider = ethProvider;
  let adminWallet = new ethers.Wallet(privateKey.privateKey, provider);

  const { amount, toAddress } = req.body;

  console.log("Transferring", amount, "ETH to", toAddress);

  const tx = await adminWallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amount),
  });

  if (!tx) throw new Error("Transaction Not Initiated");
  console.log("Transaction Initiated:", tx.hash);
  const txWait = await tx.wait();
  if (!txWait) throw new Error("Transaction Failed");
  console.log("Transaction Successful:", txWait.hash);

  return txWait;
};
