import { ethers } from "ethers";
import { addressToBytes32, ethProvider, signature } from "../../../utils/utils.js";
import { randomHookData } from "../../../utils/utils.js";
import { Tokens } from "../model/token.model.js";
import fs from "fs";
import { User } from "../../auth/models/user.model.js";

export const USDB_TO_LOCAL = async (user, amount, tokenId) => {
  try {
    if (tokenId) {
      const userPrivKey = await User.findOne({
        where: { id: user.id },
        attributes: ["privateKey"],
      });
      
      const wallet = new ethers.Wallet(userPrivKey.privateKey, ethProvider);

      const ERC20_ABI = [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function allowance(address owner, address spender) view returns (uint256)",
      ];

      const token = new ethers.Contract(
        process.env.USDB_CONTRACT,
        ERC20_ABI,
        wallet,
      );

      console.log("Token Contract:", token);

      const decimals = await token.decimals();
      console.log("Token Decimals:", decimals);

      const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

      console.log("Parsed Amount:", parsedAmount.toString());

      const remoteDomain_ABI = ["function domain() view returns (uint256)"];

      const contractAddress = await Tokens.findOne({
        where: { id: tokenId },
        attributes: ["tokenName", "tokenAddress"],
      });

      const remoteDomainContract = new ethers.Contract(
        contractAddress.tokenAddress,
        remoteDomain_ABI,
        wallet,
      );

      const remoteDomain = await remoteDomainContract.domain();

      const formattedRemoteDomain = Number(remoteDomain);

      console.log("HBLX Token Contract: ", token);

      console.log("Remote Domain: ", formattedRemoteDomain)

      const USDBSpenderAddress = process.env.XReserve_Contract_USDB; //For Sepolia Chain (XReserve for USDB )

      const tx = await token.approve(
        USDBSpenderAddress,
        parsedAmount.toString(),
      );

      console.log("USDBApproval", tx);
      const wait = await tx.wait();
      console.log("wait", wait);

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

      const xreserve = new ethers.Contract(
        USDBSpenderAddress,
        depositToRemoteStringABI,
        wallet,
      );

      console.log("XReserve Contract: ", xreserve);

      const hookdata = await randomHookData();
      console.log("Hook Data:", hookdata);

      const remoteRecipient = addressToBytes32(wallet.address);

      const xresTxIntent = await xreserve.depositToRemote(
        parsedAmount,
        formattedRemoteDomain,
        remoteRecipient,
        process.env.USDB_CONTRACT,
        0,
        hookdata,
      );

      console.log("xresTxIntent", xresTxIntent);

      const _wait = await xresTxIntent.wait();
      console.log("_wait", _wait);

      console.log("INTENT: ", xresTxIntent.data)
      const signature1 = await signature(
        process.env.ADMIN_PRIVATE_KEY,
        xresTxIntent.data,
      );

      console.log("Signature: ", signature1)

     const LocalToken_ABI = [
      "function mintByIntent(bytes intentCalldata, bytes signature) external",
    ];


      const LocalToken = new ethers.Contract(
        contractAddress.tokenAddress,
        LocalToken_ABI,
        wallet,
      );

      console.log("Local Token Contract: ", LocalToken)

      const localTokenMint = await LocalToken.mintByIntent(xresTxIntent.data, signature1);
      console.log("localTokenMint", localTokenMint);

      const localTokenMintWait = await localTokenMint.wait();
      console.log(localTokenMintWait);

      return {
        flow: `USDB To ${contractAddress.tokenName}`,
        isMint: true,
        txHash: localTokenMintWait.hash,
        intent: localTokenMint.data,
        signature: signature1,
        amount: amount
      }
    }
  } catch (error) {
    throw new Error(error.message);
  }
};
