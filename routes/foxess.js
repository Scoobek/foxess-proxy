/**
 * FoxESS API routes
 */

import { Router } from "express";
import { API_PATHS, FOXESS_BASE } from "../config/index.js";
import { generateSignature, proxyRequest } from "../lib/foxess.js";
import { handleBojlerAutoControl } from "../lib/bojler.js";

const router = Router();

// POST /api/realtime - dane bieżące z falownika + auto-control bojlera
router.post("/realtime", async (req, res) => {
    const { token, sn, variables } = req.body;

    if (!token || !sn) {
        return res
            .status(400)
            .json({ error: "Brakujące parametry: token, sn" });
    }

    const apiPath = API_PATHS.realtime;
    const timestamp = Date.now();
    const signature = generateSignature(apiPath, token, timestamp);
    const url = `${FOXESS_BASE}${apiPath}`;

    console.log(`[proxy] → ${apiPath}`);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: String(token),
                timestamp: String(timestamp),
                signature: String(signature),
                lang: "pl",
                "User-Agent": "FoxESS-Local-Proxy/1.0",
            },
            body: JSON.stringify({ sn, variables }),
        });

        const data = await response.json();
        console.log(`[proxy] ← HTTP ${response.status}`);

        // Sprawdź warunki dla bojlera (auto-control)
        if (data.errno === 0 && data.result?.[0]?.datas) {
            const datas = data.result[0].datas;
            handleBojlerAutoControl(datas);
        }

        res.status(response.status).json(data);
    } catch (err) {
        console.error("[proxy] Błąd:", err.message);
        res.status(502).json({ error: `Proxy błąd: ${err.message}` });
    }
});

// POST /api/report - raport dzienny
router.post("/report", async (req, res) => {
    const { token, sn, year, month, day, dimension, variables } = req.body;

    if (!token || !sn) {
        return res
            .status(400)
            .json({ error: "Brakujące parametry: token, sn" });
    }

    await proxyRequest(
        API_PATHS.report,
        token,
        { sn, year, month, day, dimension, variables },
        res
    );
});

// POST /api/plants - lista elektrowni
router.post("/plants", async (req, res) => {
    const { token, currentPage = 1, pageSize = 10 } = req.body;

    if (!token) {
        return res.status(400).json({ error: "Brakujący parametr: token" });
    }

    await proxyRequest(API_PATHS.plants, token, { currentPage, pageSize }, res);
});

// POST /api/history - dane historyczne
router.post("/history", async (req, res) => {
    const { token, sn, variables, begin, end } = req.body;

    if (!token || !sn) {
        return res
            .status(400)
            .json({ error: "Brakujące parametry: token, sn" });
    }

    await proxyRequest(
        API_PATHS.history,
        token,
        { sn, variables, begin, end },
        res
    );
});

export default router;
