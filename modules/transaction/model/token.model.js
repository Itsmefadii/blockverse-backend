import { DataTypes } from "sequelize";
import sequelize from "../../../config/db.js";

export const Tokens = sequelize.define(
  "Tokens",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    names: DataTypes.STRING,
    tokenName: DataTypes.STRING,
    tokenAddress: DataTypes.STRING,
    isLocalToken:DataTypes.BOOLEAN,
    remoteDomain: DataTypes.INTEGER,
    tokenType: DataTypes.STRING,
    decimals: DataTypes.INTEGER,
    isNative: DataTypes.BOOLEAN,
    isVisible: DataTypes.BOOLEAN,
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
