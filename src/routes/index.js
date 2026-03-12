/**
 * Agregator routerów
 */

import { Router } from "express";
import bojlerRoutes from "./bojler.js";
import foxessRoutes from "./foxess.js";

const router = Router();

router.use("/api", foxessRoutes);
router.use("/api/bojler", bojlerRoutes);

export default router;
