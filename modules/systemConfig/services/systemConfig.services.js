import { Tokens } from "../../transaction/model/token.model.js";

export const tokenListingServices = async (req) => {
  try {
    const { tokenId } = req.query;
    let token;

    if (tokenId) {
      token = await Tokens.findOne({
        where: {
          id: tokenId,
        },
        attributes: ["id", "names", "tokenName"],
      });

      return token
    }

    token = await Tokens.findAll({ attributes: ["id", "names", "tokenName"] });

    return token;
  } catch (error) {
    throw new Error(error.message);
  }
};
