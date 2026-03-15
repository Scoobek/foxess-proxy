/**
 * TuyAPI - komunikacja z urządzeniami Tuya
 * Persistent connection - połączenie utrzymywane, reconnect przy błędach
 */

import TuyAPI from "tuyapi";
import { TUYA_BOJLER } from "../config/tuya.js";
import {
    TUYA_CONNECT_TIMEOUT_MS,
    TUYA_MAX_RETRIES,
} from "../config/index.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("tuya");

const device = new TuyAPI({
    id: TUYA_BOJLER.id,
    key: TUYA_BOJLER.key,
    version: TUYA_BOJLER.version,
});

let isConnected = false;
let connectionPromise = null;

// Event listeners
device.on("connected", () => {
    isConnected = true;
    log.info("Połączono z urządzeniem");
});

device.on("disconnected", () => {
    isConnected = false;
    connectionPromise = null;
    log.info("Rozłączono z urządzeniem");
});

device.on("error", (err) => {
    isConnected = false;
    connectionPromise = null;
    log.error({ err }, "Błąd urządzenia");
});

// Wymuś rozłączenie (czyści zombie connection)
function forceDisconnect() {
    isConnected = false;
    connectionPromise = null;
    try {
        device.disconnect();
    } catch {
        // ignoruj
    }
}

// Zapewnij połączenie (lazy connect z Promise)
async function ensureConnected() {
    if (isConnected) return true;

    // Jeśli już trwa łączenie, czekaj na tę samą Promise
    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = (async () => {
        try {
            await device.find({ timeout: TUYA_CONNECT_TIMEOUT_MS });
            await device.connect();
            return true;
        } catch (err) {
            connectionPromise = null;
            throw err;
        }
    })();

    return connectionPromise;
}

// Helper - wykonaj operację na urządzeniu z retry
async function withDevice(operation) {
    let lastError;

    for (let attempt = 1; attempt <= TUYA_MAX_RETRIES; attempt++) {
        try {
            await ensureConnected();
            const result = await operation();
            return { success: true, ...result };
        } catch (err) {
            lastError = err;
            log.warn(
                { error: err.message, attempt, maxRetries: TUYA_MAX_RETRIES },
                "Błąd operacji - próba retry"
            );
            // Wymuś reconnect przed kolejną próbą
            forceDisconnect();

            if (attempt < TUYA_MAX_RETRIES) {
                await new Promise((r) => setTimeout(r, 500));
            }
        }
    }

    log.error({ error: lastError.message }, "Błąd operacji po wszystkich próbach");
    return { success: false, error: lastError.message };
}

// Ustaw stan bojlera
async function setBojlerState(targetState) {
    return withDevice(async () => {
        await device.set({ set: targetState });
        log.info({ isOn: targetState }, "Bojler przełączony");
        return { isOn: targetState };
    });
}

/**
 * Włącza bojler
 * @returns {Promise<{success: boolean, isOn?: boolean, error?: string}>}
 */
export const turnOnBojler = () => setBojlerState(true);

/**
 * Wyłącza bojler
 * @returns {Promise<{success: boolean, isOn?: boolean, error?: string}>}
 */
export const turnOffBojler = () => setBojlerState(false);

/**
 * Pobiera aktualny status bojlera
 * @returns {Promise<{success: boolean, isOn?: boolean, error?: string}>}
 */
export const getBojlerStatus = () =>
    withDevice(async () => {
        const isOn = await device.get({ dps: 1 });
        return { isOn };
    });

/**
 * Rozłącza urządzenie (np. przy zamykaniu aplikacji)
 */
export function disconnectDevice() {
    if (isConnected) {
        try {
            device.disconnect();
        } catch {
            // ignoruj błędy
        }
    }
}
