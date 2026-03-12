/**
 * Bojler API routes
 */

import { Router } from "express";
import { bojlerState } from "../lib/bojler.js";

const router = Router();

// GET /api/bojler/status - status bojlera
router.get("/status", (req, res) => {
    res.json(bojlerState);
});

export default router;
