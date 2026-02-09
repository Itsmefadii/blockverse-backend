import { adminRoutes } from "./modules/admin/routes/admin.routes.js";
import { authRoutes } from "./modules/auth/routes/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes/dashboard.routes.js";
import { swappingRoutes } from "./modules/swapping/routes/swapping.routes.js";
import { systemConfigRoutes } from "./modules/systemConfig/routes/systemConfig.routes.js";
import { transactonRoutes } from "./modules/transaction/routes/transaction.routes.js";

export const allRoutes = (fastify, options, done) => {
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(dashboardRoutes, { prefix: '/dashboard' });
  fastify.register(transactonRoutes, { prefix: '/transfer' });
  fastify.register(systemConfigRoutes, { prefix: '/system-configs' });
  fastify.register(adminRoutes, { prefix: '/admin' });
  fastify.register(swappingRoutes, { prefix: '/swapping' });
   fastify.get("/health", async () => {
    return {
      status: "ok",
      success: true,
      service: "api",
      timestamp: new Date().toISOString(),
    };
  });
  done();
};
