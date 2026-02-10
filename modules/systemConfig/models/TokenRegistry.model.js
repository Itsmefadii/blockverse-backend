import { DataTypes } from "sequelize";
import sequelize from "../../../config/db.js";

export const TokenRegistry = sequelize.define(
  "TokenRegistry",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
   symbol: DataTypes.STRING,
   address: DataTypes.STRING,
   decimals: DataTypes.INTEGER,
   isNative: DataTypes.BOOLEAN,
  },
  {
    freezeTableName: true,
  }
);
