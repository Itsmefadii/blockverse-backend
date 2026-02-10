import { getUserListService } from "../services/user.services.js";
import { apiResponse } from "../../../utils/utils.js";

export const userListController = async (req, reply) => {
    try {
            const data = await getUserListService(req);
    
            return reply.status(200).send(apiResponse(true, "User fetch successfully", data, 200, "SUCCESS"));
        } catch (error) {
            return reply.status(400).send(apiResponse(false, error.message, null, 400, "FAILURE"));
        }
}