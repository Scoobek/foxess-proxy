/**
 * Bojler API routes
 */

import { Router } from "express";
import { appState } from "../shared/state.js";

const router = Router();

// GET /api/bojler/status - status bojlera
router.get("/status", (_req, res) => {
    res.json(appState);
});

export default router;
