import { getAllAttestationsController, registerRemoteDomainController, reservebalanceController } from "../controller/admin.controller.js";

export const adminRoutes = (fastify, options, done) => {
    fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/register-domain",
        handler: (req, reply) => {
          if (req.method == "POST") {
            registerRemoteDomainController(req, reply);
          }
        },
      });

      fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/reserve-balance",
        handler: (req, reply) => {
          if (req.method == "GET") {
            reservebalanceController(req, reply);
          }
        },
      });

      fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/attestations",
        handler: (req, reply) => {
          if (req.method == "GET") {
            getAllAttestationsController(req, reply);
          }
        },
      });

    done();
}