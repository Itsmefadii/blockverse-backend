import { getTokenBalance } from "../../../utils/utils.js";

export const dashboardService = async(req) => {
    try {
        const user = req.user;

        return await getTokenBalance(user.walletAddress);

    } catch (error) {
        throw new Error(`Dashboard service error: ${error.message}`);
    }
}