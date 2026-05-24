import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import playRouter from "./play";
import authRouter from "./auth";
import { staffOnly } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
// All dashboard routes require an authenticated staff user.
router.use("/dashboard", staffOnly);
router.use(dashboardRouter);
router.use(playRouter);

export default router;
