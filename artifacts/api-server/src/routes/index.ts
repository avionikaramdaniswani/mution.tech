import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import deploymentsRouter from "./deployments";
import statsRouter from "./stats";
import activityRouter from "./activity";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(deploymentsRouter);
router.use(statsRouter);
router.use(activityRouter);
router.use(adminRouter);

export default router;
