import bcrypt from "bcrypt";
import { ethers } from "ethers";
import { User } from "../models/user.model.js";
import { signJWT } from "../../../utils/utils.js";
import sequelize from "../../../config/db.js";

export const signupServices = async (req) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, email, password, age, address } = req.body;

    const existingEmail = await User.findOne({ where: { email } });

    if (existingEmail) {
      throw new Error("Email already in use");
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const wallet = ethers.Wallet.createRandom();

    if (!wallet) throw new Error("Failed to generate wallet");

    console.log("Generated wallet address:", wallet);
    const userData = {
      name,
      email,
      password: hashPassword,
      age,
      address,
      privateKey: wallet.privateKey,
      walletAddress: wallet.address,
      mnemonic: wallet.mnemonic.phrase,
    };

    const data = await User.create(userData, { transaction });

    let provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    let adminWallet = new ethers.Wallet(
      process.env.ADMIN_PRIVATE_KEY,
      provider,
    );

    const tx = await adminWallet.sendTransaction({
      to: wallet.address,
      value: ethers.parseEther("0.01"),
    });

    if (!tx) throw new Error("Transaction Not Initiated");
    console.log("Transaction Initiated:", tx.hash);
    const txWait = await tx.wait();
    if (!txWait) throw new Error("Transaction Failed");
    console.log("Transaction Successful:", txWait.hash);

    provider = new ethers.JsonRpcProvider(process.env.BINANCE_RPC_URL);
    adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

    const bnbTx = await adminWallet.sendTransaction({
      to: wallet.address,
      value: ethers.parseEther("0.01"),
    });

    if (!bnbTx) throw new Error("Transaction Not Initiated");
    console.log("Transaction Initiated:", bnbTx.hash);
    const bnbTxWait = await tx.wait();
    if (!bnbTxWait) throw new Error("Transaction Failed");
    console.log("Transaction Successful:", bnbTx.hash);

    await transaction.commit();
    return data;
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};

export const loginServices = async (req) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      attributes: ["id", "name", "email", "password", "walletAddress"],
    });
    if (!user) {
      throw new Error("User not found");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    const token = await signJWT(user);

    const data = {
      id: user.id,
      name: user.name,
      email: user.email,
      walletAddress: user.walletAddress,
      token,
    };
    return data;
  } catch (error) {
    throw new Error(error.message);
  }
};
