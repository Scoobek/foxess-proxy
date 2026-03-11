/**
 * FoxESS Cloud – lokalny proxy serwer
 * Uruchom: node server.js
 * Dashboard będzie dostępny na: http://localhost:3000
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── GENEROWANIE PODPISU MD5 ────────────────────────────────────────────────
// FoxESS wymaga literalnych znaków \r\n (nie CR+LF)
function generateSignature(apiPath, apiKey, timestamp) {
    const message = `${apiPath}\\r\\n${apiKey}\\r\\n${timestamp}`;
    return crypto.createHash("md5").update(message, "utf8").digest("hex");
}

const app = express();
const PORT = 3000;
const FOXESS_BASE = "https://www.foxesscloud.com";

// Parsuj JSON body
app.use(express.json());

// Serwuj dashboard (plik HTML) pod /
app.use(express.static(path.join(__dirname, "public")));

// ─── FOXESS API PATHS ───────────────────────────────────────────────────────
const API_PATHS = {
    realtime: "/op/v0/device/real/query",
    report: "/op/v0/device/report/query",
    plants: "/op/v0/plant/list",
    history: "/op/v0/device/history/query",
};

// ─── PROXY HELPER ───────────────────────────────────────────────────────────
async function proxyRequest(apiPath, token, body, res) {
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
            body: JSON.stringify(body ?? {}),
        });

        const text = await response.text();
        console.log(`[proxy] ← HTTP ${response.status}`);

        res.status(response.status)
            .set("Content-Type", "application/json")
            .send(text);
    } catch (err) {
        console.error("[proxy] Błąd:", err.message);
        res.status(502).json({ error: `Proxy błąd: ${err.message}` });
    }
}

// ─── API ENDPOINTS ──────────────────────────────────────────────────────────

// GET /api/realtime - dane bieżące z falownika
app.post("/api/realtime", async (req, res) => {
    const { token, sn, variables } = req.body;

    if (!token || !sn) {
        return res.status(400).json({ error: "Brakujące parametry: token, sn" });
    }

    await proxyRequest(API_PATHS.realtime, token, { sn, variables }, res);
});

// POST /api/report - raport dzienny
app.post("/api/report", async (req, res) => {
    const { token, sn, year, month, day, dimension, variables } = req.body;

    if (!token || !sn) {
        return res.status(400).json({ error: "Brakujące parametry: token, sn" });
    }

    await proxyRequest(
        API_PATHS.report,
        token,
        { sn, year, month, day, dimension, variables },
        res
    );
});

// POST /api/plants - lista elektrowni
app.post("/api/plants", async (req, res) => {
    const { token, currentPage = 1, pageSize = 10 } = req.body;

    if (!token) {
        return res.status(400).json({ error: "Brakujący parametr: token" });
    }

    await proxyRequest(API_PATHS.plants, token, { currentPage, pageSize }, res);
});

// POST /api/history - dane historyczne
app.post("/api/history", async (req, res) => {
    const { token, sn, variables, begin, end } = req.body;

    if (!token || !sn) {
        return res.status(400).json({ error: "Brakujące parametry: token, sn" });
    }

    await proxyRequest(API_PATHS.history, token, { sn, variables, begin, end }, res);
});

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅  FoxESS Proxy działa na http://localhost:${PORT}\n`);
});
