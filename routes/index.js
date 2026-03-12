/**
 * Agregator routerów
 */

import { Router } from "express";
import foxessRoutes from "./foxess.js";
import bojlerRoutes from "./bojler.js";

const router = Router();

router.use("/api", foxessRoutes);
router.use("/api/bojler", bojlerRoutes);

export default router;
