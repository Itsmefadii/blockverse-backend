import { tokenEquivalentAmount } from "../services/swapping.services.js";
import { apiResponse } from "../../../utils/utils.js";
import { SwappingService } from "../services/swapping.services.js";

export const swappingController = async (req, reply) => {
  try {
    const data = await SwappingService(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Swapping successful", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, `Swapping failed: ${error.message}`, null, 500, "error"));
  }
};

export const tokenEquivalentAmountController = async (req, reply) => {
  try {
    const data = await tokenEquivalentAmount(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Amount fetched successful", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, `Fetching token equivalent amount failed: ${error.message}`, null, 500, "error"));
  }
};