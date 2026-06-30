import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import deploymentsRouter from "./deployments";
import statsRouter from "./stats";
import activityRouter from "./activity";
import adminRouter from "./admin";
import githubRouter from "./github";
import billingRouter from "./billing";
import apiKeysRouter from "./api-keys";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(githubRouter);
router.use(billingRouter);
router.use(apiKeysRouter);
router.use(projectsRouter);
router.use(deploymentsRouter);
router.use(statsRouter);
router.use(activityRouter);
router.use(adminRouter);

export default router;
