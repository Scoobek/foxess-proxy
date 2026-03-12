/**
 * FoxESS Cloud API - logika podpisu i proxy
 */

import crypto from "crypto";
import { FOXESS_BASE } from "../config/index.js";

// FoxESS wymaga literalnych znaków \r\n (nie CR+LF)
export function generateSignature(apiPath, apiKey, timestamp) {
    const message = `${apiPath}\\r\\n${apiKey}\\r\\n${timestamp}`;
    return crypto.createHash("md5").update(message, "utf8").digest("hex");
}

export async function proxyRequest(apiPath, token, body, res) {
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
