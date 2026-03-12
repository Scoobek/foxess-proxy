/**
 * FoxESS Service - warstwa API do komunikacji z FoxESS Cloud
 */

import {
    FOXESS_BASE,
    API_PATHS,
    API_KEY,
    INVERTER_SN,
} from "../../config/foxess.js";
import { generateSignature } from "../../lib/foxess.js";

/**
 * Wykonuje request do FoxESS API
 * @param {string} apiPath - ścieżka API
 * @param {object} body - dane do wysłania
 * @returns {Promise<{success: boolean, data?: object, status?: number, error?: string}>}
 */
async function foxessRequest(apiPath, body = {}) {
    const timestamp = Date.now();
    const signature = generateSignature(apiPath, API_KEY, timestamp);
    const url = `${FOXESS_BASE}${apiPath}`;

    console.log(`[foxessService] → ${apiPath}`);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token: String(API_KEY),
                timestamp: String(timestamp),
                signature: String(signature),
                lang: "pl",
                "User-Agent": "FoxESS-Local-Proxy/1.0",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log(`[foxessService] ← HTTP ${response.status}`);

        return { success: true, data, status: response.status };
    } catch (err) {
        console.error("[foxessService] Błąd:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Pobiera dane real-time z falownika
 */
export async function fetchRealtimeData(variables) {
    return foxessRequest(API_PATHS.realtime, { sn: INVERTER_SN, variables });
}

/**
 * Pobiera raport dzienny
 */
export async function fetchReport(params) {
    const { year, month, day, dimension, variables } = params;
    return foxessRequest(API_PATHS.report, {
        sn: INVERTER_SN,
        year,
        month,
        day,
        dimension,
        variables,
    });
}

/**
 * Pobiera listę elektrowni
 */
export async function fetchPlants(params = {}) {
    const { currentPage = 1, pageSize = 10 } = params;
    return foxessRequest(API_PATHS.plants, { currentPage, pageSize });
}

/**
 * Pobiera dane historyczne
 */
export async function fetchHistory(params) {
    const { variables, begin, end } = params;
    return foxessRequest(API_PATHS.history, {
        sn: INVERTER_SN,
        variables,
        begin,
        end,
    });
}
