/**
 * FoxESS Cloud API - logika podpisu
 */

import crypto from "crypto";

// FoxESS wymaga literalnych znaków \r\n (nie CR+LF)
export function generateSignature(apiPath, apiKey, timestamp) {
    const message = `${apiPath}\\r\\n${apiKey}\\r\\n${timestamp}`;
    return crypto.createHash("md5").update(message, "utf8").digest("hex");
}
