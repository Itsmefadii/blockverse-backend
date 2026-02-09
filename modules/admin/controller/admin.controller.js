import { apiResponse } from "../../../utils/utils.js";
import { registerRemoteDomainService, reserveBalanceService } from "../services/admin.services.js";

export const registerRemoteDomainController = async (req, reply) => {
  try {
    const data = await registerRemoteDomainService(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Remote domain registered successfully", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, `Remote domain registration failed: ${error.message}`, null, 500, "error"));
  }
};

export const reservebalanceController = async (req, reply) => {
  try {
    const data = await reserveBalanceService(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Reserve balance fetched successfully", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, error.message, null, 500, "error"));
  }
};