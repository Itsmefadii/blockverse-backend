import { login, signup } from "../controller/auth.controller.js";

export const authRoutes = (fastify, options, done) => {
    fastify.route({
    method: ["GET", "POST", "PUT", "DELETE"],
    url: "/signup",
    handler: (req, reply) => {
      if (req.method == "POST") {
        signup(req, reply);
      }
    },
  });

  fastify.route({
    method: ["GET", "POST", "PUT", "DELETE"],
    url: "/login",
    handler: (req, reply) => {
      if (req.method == "POST") {
        login(req, reply);
      }
    },
  });

  done();
}