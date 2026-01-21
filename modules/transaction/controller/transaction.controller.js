import { apiResponse } from "../../../utils/utils.js";
import { transactionApprovalService, transferTokenService } from "../services/transaction.services.js";

export const transferToken = async (req, reply) => {
  try {
    const data = await transferTokenService(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Transfer successful", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, error.message, null, 500, "error"));
  }
};

export const transactionApprovalController = async (req, reply) => {
  try {
    const data = await transactionApprovalService(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Successfully Converted", data.data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, `Conversion failed: ${error.message}`, null, 500, "error"));
  }
};
