import { Op } from "sequelize";
import { Tokens } from "../../transaction/model/token.model.js";
import { TokenRegistry } from "../models/TokenRegistry.model.js";

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
          [Op.or]: [{ tokenName: "USDC" }, { islocalToken: true }]
        },
        attributes: ["id", "names", "tokenName"],
      });

      return token;
    }

    token = await Tokens.findAll({
      where: {
        [Op.or]: [{ tokenName: "USDC" }, { islocalToken: true }],
      },
      attributes: ["id", "names", "tokenName"],
    });

    return token;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const tokenRegistryListingService = async (req) => {
  try {
    let token;
    if (req.query?.tokenId) {
      token = await Tokens.findAll({
        where: {
          id: {
            [Op.ne]: req.query.tokenId,
          },
        },
        attributes: ["id", "tokenName"],
      });
      return token;
    }
    token = await Tokens.findAll({
      where: {
        isVisible: true,
      },
      attributes: ["id", "tokenName"],
    });

    return token;
  } catch (error) {
    throw new Error(error.message);
  }
};
