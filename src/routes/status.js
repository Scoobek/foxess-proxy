/**
 * Status routes - SSE stream stanu aplikacji
 */

import { Router } from "express";
import { appState } from "../shared/state.js";
import { addClient, removeClient } from "../shared/sse.js";

const router = Router();

// GET /api/status/stream - SSE stream stanu aplikacji
router.get("/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write(`data: ${JSON.stringify(appState)}\n\n`);
    addClient(res);

    req.on("close", () => removeClient(res));
});

export default router;
