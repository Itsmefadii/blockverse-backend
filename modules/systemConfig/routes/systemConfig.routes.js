import { tokenListingController } from "../controller/systemConfig.controller.js";

export const systemConfigRoutes = (fastify, options, done) => {
    fastify.route({
        method: ["GET", "POST", "PUT", "DELETE"],
        url: "/token-listing",
        handler: (req, reply) => {
          if (req.method == "GET") {
            tokenListingController(req, reply);
          }
        },
      });

    done();
}