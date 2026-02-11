import { DataTypes } from "sequelize";
import sequelize from "../../../config/db.js";

export const Attestations = sequelize.define(
  "Attestations",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    transactionFlow: DataTypes.STRING,
    transactionData: DataTypes.JSON,
    userId: DataTypes.INTEGER,
    attestedBy: DataTypes.STRING,
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
  },
);
