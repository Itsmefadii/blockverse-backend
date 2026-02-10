import { getTokenBalance } from "../../../utils/utils.js";
import { User } from "../../auth/models/user.model.js";
import { Op } from "sequelize";

export const getUserListService = async (req) => {
  try {
    if(req.user.role === "user"){
      throw new Error("Only admin can access this resource");
    }
    const { id, searchTxt, searchBy } = req.query;

    if (searchBy) {
      let search = {};
      if (searchBy === "name") {
        search = { name: { [Op.like]: `%${searchTxt}%` } };
      }
      if (searchBy === "email") {
        search = { email: { [Op.like]: `%${searchTxt}%` } };
      }
      if (searchBy === "address") {
        search = { address: { [Op.like]: `%${searchTxt}%` } };
      }
      const userList = await User.findAll({
        where: {
          [Op.and]: [search, { roleId: { [Op.ne]: 1 } }],
        },
      });

      return userList;
    }

    if (id) {
      const user = await User.findOne({
        where: {
          id: id,
        },
        attributes: ["id", "name", "email", "age", "address", "walletAddress"],
      });

      const balances = await getTokenBalance(user.walletAddress);

      user.dataValues.balances = balances;

      return user;
    }

    const userList = await User.findAll({
      where: {
        roleId: { [Op.ne]: 1 },
      },
    });
    return userList;
  } catch (error) {
    throw new Error(error);
  }
};
