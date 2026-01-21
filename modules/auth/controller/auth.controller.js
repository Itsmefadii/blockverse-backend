import { loginServices, signupServices } from "../services/auth.services.js"
import {apiResponse} from "../../../utils/utils.js"

export const signup = async (req, reply) => {
    try {
        const data = await signupServices(req);

        return reply.status(200).send(apiResponse(true, "Signup successful", data, 200, "SUCCESS"));
    } catch (error) {
        return reply.status(400).send(apiResponse(false, `Signup failed: ${error.message}`, null, 400, "FAILURE"));
    }
}

export const login = async (req, reply) => {
    try {
        const data = await loginServices(req)

        return reply.status(200).send(apiResponse(true, "Login successful", data, 200, "SUCCESS"));
    } catch (error) {
        return reply.status(400).send(apiResponse(false, `Login failed: ${error.message}`, null, 400, "FAILURE"));
    }
}