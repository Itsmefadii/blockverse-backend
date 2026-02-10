import { userListController } from "../controller/user.controller.js";


export const userRoutes = (fastify, options, done) => {
     fastify.route({
            method: ["GET", "POST", "PUT", "DELETE"],
            url: "/",
            handler: (req, reply) => {
              if (req.method == "GET") {
                userListController(req, reply);
              }
            },
          });
    done();
};
