import { User } from "../../auth/models/user.model.js";
import { ethers } from "ethers";
import { AbiCoder } from "ethers";
import { addressToBytes32, ethProvider } from "../../../utils/utils.js";
import { _signature } from "../../../utils/utils.js";
import { Tokens } from "../model/token.model.js";

export const Local_TO_USDB = async (user, amount, from) => {
  try {
    console.log("Local_TO_USDB Helper Function Called");
    const walletAddress = user.walletAddress;
    const privateKey = await User.findOne({
      where: {
        id: user.id,
      },
      attributes: ["privateKey"],
    });

    const formatWalletAddress = addressToBytes32(walletAddress);

    const burningAbi = [
      "function burnForUSDB(uint256 amount, uint32 destinationDomain, bytes32 destinationRecipient)",
      "event BurnForUSDB(bytes32 burner, bytes32 localToken, uint32 remoteDomain, uint256 amount, uint32 destinationDomain, bytes32 destinationRecipient, bytes hookData)",
    ];

    // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // 2️⃣ Signer (WRITE)
    const signer = new ethers.Wallet(
      privateKey.privateKey, // 🔑 MUST be backend wallet private key
      ethProvider,
    );

    const localTokenAddress = await Tokens.findOne({
      where: {
        id: from,
      },
      attributes: ["tokenName", "tokenAddress"],
    });
    console.log("USDB_Address: ", process.env.USDB_CONTRACT);
    const burnContract = new ethers.Contract(
      localTokenAddress.tokenAddress,
      burningAbi,
      signer,
    );
    console.log("burnContract: ", burnContract);

    const parsedAmount = ethers.parseUnits(amount, 6);

    const burningTransaction = await burnContract.burnForUSDB(
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
    const burnEvent = parsedLogs.find((e) => e.name === "BurnForUSDB");

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
      process.env.XReserve_Contract_USDB,
      withdrawAbi,
      signer,
    );

    console.log("withdrawContract: ", withdrawContract);

    const withdrawTransaction = await withdrawContract.withdraw(
      process.env.USDB_CONTRACT,
      encodedEventData,
      _signature1,
    );

    console.log("withdrawTransaction: ", withdrawTransaction);

    const withdrawTransactionWait = await withdrawTransaction.wait();

    console.log("withdrawTransactionWait: ", withdrawTransactionWait);

    return {
      flow: `${localTokenAddress.tokenName} To USDB`,
      txHash: withdrawTransactionWait.hash,
      intent: encodedEventData,
      signature: _signature1,
      amount: amount,
    };
  } catch (error) {}
};
