/**
 * TuyAPI - komunikacja z urządzeniami Tuya
 * Persistent connection - połączenie utrzymywane, reconnect przy błędach
 */

import TuyAPI from "tuyapi";
import { TUYA_BOJLER } from "../config/tuya.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("tuya");

const device = new TuyAPI({
    id: TUYA_BOJLER.id,
    key: TUYA_BOJLER.key,
    version: TUYA_BOJLER.version,
});

let isConnected = false;
let isConnecting = false;

// Event listeners
device.on("connected", () => {
    isConnected = true;
    isConnecting = false;
    log.info("Połączono z urządzeniem");
});

device.on("disconnected", () => {
    isConnected = false;
    log.info("Rozłączono z urządzeniem");
});

device.on("error", (err) => {
    isConnected = false;
    isConnecting = false;
    log.error({ err }, "Błąd urządzenia");
});

// Zapewnij połączenie (lazy connect)
async function ensureConnected() {
    if (isConnected) return true;
    if (isConnecting) {
        // Poczekaj na zakończenie trwającego połączenia
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return isConnected;
    }

    isConnecting = true;
    try {
        await device.find({ timeout: 10000 });
        await device.connect();
        return true;
    } catch (err) {
        isConnecting = false;
        throw err;
    }
}

// Helper - wykonaj operację na urządzeniu
async function withDevice(operation) {
    try {
        await ensureConnected();
        const result = await operation();
        return { success: true, ...result };
    } catch (err) {
        log.error({ error: err.message }, "Błąd operacji");
        // Przy błędzie wymuś reconnect przy następnej operacji
        isConnected = false;
        return { success: false, error: err.message };
    }
}

// Ustaw stan bojlera
async function setBojlerState(targetState) {
    return withDevice(async () => {
        await device.set({ set: targetState });
        log.info({ isOn: targetState }, "Bojler przełączony");
        return { isOn: targetState };
    });
}

// Włącz bojler
export const turnOnBojler = () => setBojlerState(true);

// Wyłącz bojler
export const turnOffBojler = () => setBojlerState(false);

// Pobierz status bojlera
export const getBojlerStatus = () =>
    withDevice(async () => {
        const isOn = await device.get({ dps: 1 });
        return { isOn };
    });

// Rozłącz urządzenie (np. przy zamykaniu aplikacji)
export function disconnectDevice() {
    if (isConnected) {
        try {
            device.disconnect();
        } catch {
            // ignoruj błędy
        }
    }
}
