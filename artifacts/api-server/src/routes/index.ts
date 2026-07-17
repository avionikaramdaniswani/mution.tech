import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import deploymentsRouter from "./deployments";
import statsRouter from "./stats";
import activityRouter from "./activity";
import adminRouter from "./admin";
import eventsRouter from "./events";
import githubRouter from "./github";
import billingRouter from "./billing";
import apiKeysRouter from "./api-keys";
import apiUsageRouter from "./api-usage";
import changelogsRouter from "./changelogs";
import integrationsRouter from "./integrations";
import catalogRouter from "./catalog";
import packagesRouter from "./packages";
import referralRouter from "./referral";

const router: IRouter = Router();

// Public routes — harus didaftarkan SEBELUM router yang punya global requireAuth
router.use(healthRouter);
router.use(catalogRouter);   // /catalog — public, tidak butuh auth
router.use(packagesRouter);  // /packages — public, tidak butuh auth

// Auth routes
router.use(authRouter);
router.use(githubRouter);

// Authenticated routes
router.use(referralRouter);   // must be before adminRouter (adminRouter has a catch-all requireAdmin)
router.use(billingRouter);
router.use(apiKeysRouter);
router.use(projectsRouter);
router.use(deploymentsRouter);
router.use(statsRouter);
router.use(activityRouter);
router.use(eventsRouter);
router.use(apiUsageRouter);
router.use(changelogsRouter);
router.use(integrationsRouter);
router.use(adminRouter);      // last: has global requireAdmin middleware

export default router;
