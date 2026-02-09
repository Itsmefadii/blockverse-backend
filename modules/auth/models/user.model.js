import { DataTypes } from "sequelize";
import sequelize from "../../../config/db.js";

export const User = sequelize.define(
  "user",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    email: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
    },
    password: DataTypes.STRING(100),
    age: DataTypes.INTEGER,
    address: DataTypes.STRING,
    privateKey: DataTypes.STRING,
    walletAddress: DataTypes.STRING,
    mnemonic: DataTypes.TEXT,
    roleId: DataTypes.INTEGER,
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      
  },
  updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    freezeTableName: true,
    timestamps: true,
  }
);
