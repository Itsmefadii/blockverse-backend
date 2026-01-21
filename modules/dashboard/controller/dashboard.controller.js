import { apiResponse } from "../../../utils/utils.js";
import { dashboardService } from "../services/dashboard.services.js";

export const dashboardController = async (request, reply) => {
    try {
        const data = await dashboardService(request);
        return reply.status(200).send(apiResponse(true, "Dashboard data fetched successfully", data, 200, "SUCCESS"));
    } catch (error) {
        return reply.status(400).send(apiResponse(false, `Failed to fetch dashboard data: ${error.message}`, null, 400, "FAILURE"));
    }
}