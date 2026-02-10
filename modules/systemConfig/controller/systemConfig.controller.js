import { apiResponse } from "../../../utils/utils.js";
import { tokenListingServices, tokenRegistryListingService } from "../services/systemConfig.services.js";

export const tokenListingController = async (req, reply) => {
  try {
    const data = await tokenListingServices(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Token listing fetched successfully", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, `Token fetching failed: ${error.message}`, null, 500, "error"));
  }
};

export const tokenRegistryListingController = async (req, reply) => {
  try {
    const data = await tokenRegistryListingService(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Token listing fetched successfully", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, `Token fetching failed: ${error.message}`, null, 500, "error"));
  }
};