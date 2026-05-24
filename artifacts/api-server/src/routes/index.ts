import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import playRouter from "./play";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(playRouter);

export default router;
