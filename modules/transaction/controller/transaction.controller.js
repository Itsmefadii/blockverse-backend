import { apiResponse } from "../../../utils/utils.js";
import { ethBnbTransferService, transactionApprovalService, transferTokenService } from "../services/transaction.services.js";

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
      .send(apiResponse(true, "Successfully Converted", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, error.message, null, 500, "error"));
  }
};

export const ethBnbTransferController = async (req, reply) => {
  try {
    const data = await ethBnbTransferService(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Successfully Transfer", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, error.message, null, 500, "error"));
  }
};

export const testingConversionController = async (req, reply) => {
  try {
    const data = await testingConversionService(req);

    return reply
      .status(200)
      .send(apiResponse(true, "Successfully Transfer", data, 200, "success"));
  } catch (error) {
    return reply
      .status(400)
      .send(apiResponse(false, error.message, null, 500, "error"));
  }
};