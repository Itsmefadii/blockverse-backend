import { dashboardController } from "../controller/dashboard.controller.js";

export const dashboardRoutes = (fastify, options, done) => {
    fastify.route({
    method: ["GET", "POST", "PUT", "DELETE"],
    url: "/",
    handler: (req, reply) => {
      if (req.method == "GET") {
        dashboardController(req, reply);
      }
    },
  });

  done();
}