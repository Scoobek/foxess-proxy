/**
 * FoxESS API routes
 */

import { Router } from "express";
import {
    fetchRealtimeData,
    fetchReport,
    fetchPlants,
    fetchHistory,
} from "../worker/services/foxessService.js";
import { processRealtimeData } from "../worker/managers/foxessDataManager.js";

const router = Router();

/**
 * Helper - obsługa odpowiedzi z foxessService
 */
function handleServiceResponse(result, res) {
    if (!result.success) {
        return res.status(502).json({ error: `Proxy błąd: ${result.error}` });
    }
    res.status(result.status).json(result.data);
}

// POST /api/realtime - dane bieżące z falownika + auto-control bojlera
router.post("/realtime", async (req, res) => {
    const { variables } = req.body;

    const result = await fetchRealtimeData(variables);

    if (result.success) {
        processRealtimeData(result.data);
    }

    handleServiceResponse(result, res);
});

// POST /api/report - raport dzienny
router.post("/report", async (req, res) => {
    const { year, month, day, dimension, variables } = req.body;

    const result = await fetchReport({ year, month, day, dimension, variables });
    handleServiceResponse(result, res);
});

// POST /api/plants - lista elektrowni
router.post("/plants", async (req, res) => {
    const { currentPage, pageSize } = req.body;

    const result = await fetchPlants({ currentPage, pageSize });
    handleServiceResponse(result, res);
});

// POST /api/history - dane historyczne
router.post("/history", async (req, res) => {
    const { variables, begin, end } = req.body;

    const result = await fetchHistory({ variables, begin, end });
    handleServiceResponse(result, res);
});

export default router;
