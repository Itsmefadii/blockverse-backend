import bcrypt from "bcrypt";
import { ethers } from "ethers";
import { User } from "../models/user.model.js";
import { bnbProvider, ethProvider, signJWT } from "../../../utils/utils.js";
import sequelize from "../../../config/db.js";
import { Roles } from "../models/roles.model.js";

export const signupServices = async (req) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, email, password, age, address, roleId } = req.body;

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
      roleId: 2,
    };

    const data = await User.create(userData, { transaction });

    
    const role = await Roles.findOne({
      where: {
        id: data.roleId,
      },
      attributes: ["roleName"],
    });

    const user = {
      id: data.id,
      name,
      email,
      walletAddress: wallet.address,
      roleId: 2,
      role: role.roleName,
    };

    console.log("User: ", user);

    const token = await signJWT(user);

    let provider = ethProvider;
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



    

    // provider = bnbProvider;
    // provider = ethProvider;
    // adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

    // const bnbTx = await adminWallet.sendTransaction({
    //   to: wallet.address,
    //   value: ethers.parseEther("0.01"),
    // });

    // if (!bnbTx) throw new Error("Transaction Not Initiated");
    // console.log("Transaction Initiated:", bnbTx.hash);
    // const bnbTxWait = await tx.wait();
    // if (!bnbTxWait) throw new Error("Transaction Failed");
    // console.log("Transaction Successful:", bnbTx.hash);

    await transaction.commit();

    const responseData = {
      id: data.id,
      name,
      email,
      walletAddress: wallet.address,
      roleId: 2,
      role: role.roleName,
      token
    }   
    return responseData;
  } catch (error) {
    await transaction.rollback();
    throw new Error(error.message);
  }
};

export const loginServices = async (req) => {
  try {
    const { email, password } = req.body;
    const { isAdmin } = req.query;

    const user = await User.findOne({
      where: { email },
      attributes: [
        "id",
        "name",
        "email",
        "password",
        "walletAddress",
        "roleId",
      ],
    });
    if (!user) {
      throw new Error("User not found");
    }

    const role = await Roles.findOne({
      where: {
        id: user.roleId,
      },
      attributes: ["roleName"],
    });

    console.log("Role: ", role);

    user.dataValues.role = role.roleName;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    console.log("ROLE: ", role.roleName)
    console.log("Is Admin: ", isAdmin)
    console.log("ROLE: ", role.roleName);
    console.log("Is Admin: ", isAdmin);
    if (!isAdmin && role.roleName === "admin") {
      throw new Error("Unauthorized User");
    }
    if (isAdmin && role.roleName === "user") {
      throw new Error("Unauthorized user");
    }

    console.log("User: ", user.dataValues);
    const token = await signJWT(user.dataValues);

    const data = {
      id: user.id,
      name: user.name,
      email: user.email,
      walletAddress: user.walletAddress,
      role: role.roleName,
      token,
    };
    return data;
  } catch (error) {
    throw new Error(error.message);
  }
};
