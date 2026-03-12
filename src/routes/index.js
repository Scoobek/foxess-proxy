/**
 * Agregator routerów
 */

import { Router } from "express";
import foxessRoutes from "./foxess.js";
import bojlerRoutes from "./bojler.js";
import sunrisesunsetRoutes from "./sunrisesunset.js";

const router = Router();

router.use("/api", foxessRoutes);
router.use("/api/bojler", bojlerRoutes);
router.use("/api/sunrisesunset", sunrisesunsetRoutes);

export default router;
