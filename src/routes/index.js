/**
 * Agregator routerów
 */

import { Router } from "express";
import bojlerRoutes from "./bojler.js";
import foxessRoutes from "./foxess.js";
import statusRoutes from "./status.js";
import acRoutes from "./ac.js";

const router = Router();

router.use("/api", foxessRoutes);
router.use("/api/bojler", bojlerRoutes);
router.use("/api/status", statusRoutes);
router.use("/api/ac", acRoutes);

export default router;
