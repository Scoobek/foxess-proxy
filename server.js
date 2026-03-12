/**
 * FoxESS Cloud – lokalny proxy serwer
 * Uruchom: node server.js
 * Dashboard będzie dostępny na: http://localhost:3000
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { turnOnBojler } from "./socket.js";

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

// ─── BOJLER STATE & AUTO-CONTROL ────────────────────────────────────────────
const BOJLER_POWER_THRESHOLD = 0.2; // W

const bojlerState = {
    isOn: false,
    lastChange: null,
    lastCheck: null,
    turnedOnBy: null, // 'auto' | 'manual' | null
    pvPower: 0,
    loadsPower: 0,
    surplus: 0,
};

function updateBojlerState(updates) {
    Object.assign(bojlerState, updates);
    console.log(
        `[bojler] Stan: ${bojlerState.isOn ? "🟢 WŁĄCZONY" : "🔴 WYŁĄCZONY"}`
    );
}

function checkBojlerConditions(datas) {
    const pvPower = datas.find((d) => d.variable === "pvPower")?.value ?? 0;
    const loadsPower =
        datas.find((d) => d.variable === "loadsPower")?.value ?? 0;
    const surplus = pvPower - loadsPower;

    // Aktualizuj stan z danymi PV
    bojlerState.pvPower = pvPower;
    bojlerState.loadsPower = loadsPower;
    bojlerState.surplus = surplus;
    bojlerState.lastCheck = new Date().toISOString();

    console.log(
        `[bojler] pvPower: ${pvPower}W, loadsPower: ${loadsPower}W, nadwyżka: ${surplus}W`
    );

    // Warunki: pvPower > 1650 AND (pvPower - loadsPower) >= 1650
    const shouldTurnOn =
        pvPower > BOJLER_POWER_THRESHOLD && surplus >= BOJLER_POWER_THRESHOLD;

    if (shouldTurnOn) {
        console.log(`[bojler] Warunki spełnione - można uruchomić bojler`);
    }

    return shouldTurnOn;
}

async function handleBojlerAutoControl(datas) {
    const shouldTurnOn = checkBojlerConditions(datas);

    if (shouldTurnOn && !bojlerState.isOn) {
        const result = await turnOnBojler();
        if (result.success) {
            updateBojlerState({
                isOn: true,
                lastChange: new Date().toISOString(),
                turnedOnBy: "auto",
            });
        }
    }
}

// ─── API ENDPOINTS ──────────────────────────────────────────────────────────

// POST /api/realtime - dane bieżące z falownika + auto-control bojlera
app.post("/api/realtime", async (req, res) => {
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
app.post("/api/report", async (req, res) => {
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

// ─── BOJLER STATUS ENDPOINT ─────────────────────────────────────────────────
app.get("/api/bojler/status", (req, res) => {
    res.json(bojlerState);
});

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅  FoxESS Proxy działa na http://localhost:${PORT}\n`);
});
