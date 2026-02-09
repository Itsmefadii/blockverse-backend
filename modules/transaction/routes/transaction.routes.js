import { ethBnbTransferController, testingConversionController, transactionApprovalController, transferToken } from "../controller/transaction.controller.js";

export const transactonRoutes = (fastify, options, done) => {
    fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/",
        handler: (req, reply) => {
          if (req.method == "POST") {
            transferToken(req, reply);
          }
        },
      });

      fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/tokens",
        handler: (req, reply) => {
          if (req.method == "POST") {
            transactionApprovalController(req, reply);
          }
        },
      });

      fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/eth_bnb",
        handler: (req, reply) => {
          if (req.method == "POST") {
            ethBnbTransferController(req, reply);
          }
        },
      });

      fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/testing_conversion",
        handler: (req, reply) => {
          if (req.method == "POST") {
            testingConversionController(req, reply);
          }
        },
      });

    done();
}