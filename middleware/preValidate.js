import { verify } from "crypto";
import { apiResponse } from "../utils/utils.js";
import { verifyAccessToken } from "../utils/utils.js";
const insecureRoutes = [
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/health"
];

export function preValidate(fastify){
    fastify.addHook("onRequest", async (request, reply) => {
        try {
            const url = request.url?.split("?")[0];
            const ip = request.ip
            const method = request.method;

            console.log("url", url)
            console.log("ip", ip)
            console.log("method", method)
            if (insecureRoutes.includes(url)) {
                return;
            }

            const authHeader = request.headers.authorization;
            const authToken = authHeader ? authHeader.split(" ")[1] : null;

            if(!authToken){
                return reply.status(401).send(apiResponse(false, "Unauthorized: No token provided", null, 401, "error"));  
            }

            let user = await verifyAccessToken(authToken);
            // await authorize(user, method, url)
            request.user = user;

            console.log("Authenticated user:", user);

        } catch (error) {
            return reply.status(401).send(apiResponse(false, `Unauthorized: ${error.message}`, null, 401, "error"));
        }
    })
}