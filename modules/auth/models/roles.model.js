import { DataTypes } from "sequelize";
import sequelize from "../../../config/db.js";

export const Roles = sequelize.define(
  "Roles",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    roleName: DataTypes.STRING,  },
  {
    freezeTableName: true,
  }
);
