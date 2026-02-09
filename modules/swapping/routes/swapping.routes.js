import { swappingController, tokenEquivalentAmountController } from "../controller/swapping.controller.js";

export const swappingRoutes = (fastify, options, done) => {
    fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/",
        handler: (req, reply) => {
          if (req.method == "POST") {
            swappingController(req, reply);
          }
        },
      });

      fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/token-equivalent",
        handler: (req, reply) => {
          if (req.method == "GET") {
            tokenEquivalentAmountController(req, reply);
          }
        },
      });

    done();
}