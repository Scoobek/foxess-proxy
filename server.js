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

// ─── PROXY ENDPOINT ─────────────────────────────────────────────────────────
// Frontend wywołuje POST http://localhost:3000/proxy
// Body: { path, token, timestamp, signature, body }
// Serwer przekazuje żądanie do FoxESS i zwraca odpowiedź

app.post("/proxy", async (req, res) => {
    const { apiPath, token, body } = req.body;

    if (!apiPath || !token) {
        return res.status(400).json({
            error: "Brakujące parametry: apiPath, token",
        });
    }

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
});

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅  FoxESS Proxy działa na http://localhost:${PORT}\n`);
});
