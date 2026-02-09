import { Op } from "sequelize";
import { Tokens } from "../../transaction/model/token.model.js";

export const tokenListingServices = async (req) => {
  try {
    const { tokenId } = req.query;
    let token;

    if (tokenId) {
      // To filter drop menu on dashboard
      const token = await Tokens.findAll({
        where: {
          id: {
            [Op.ne]: tokenId,
          },
        },
        attributes: ["id", "names", "tokenName"],
      });

      return token;
    }

    token = await Tokens.findAll({ attributes: ["id", "names", "tokenName"] });

    return token;
  } catch (error) {
    throw new Error(error.message);
  }
};
