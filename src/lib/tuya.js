/**
 * TuyAPI - komunikacja z urządzeniami Tuya
 */

import TuyAPI from "tuyapi";
import { TUYA_BOJLER } from "../config/tuya.js";

const device = new TuyAPI({
    id: TUYA_BOJLER.id,
    key: TUYA_BOJLER.key,
    version: TUYA_BOJLER.version,
});

device.on("error", (err) => console.error("[tuya] Błąd:", err));

// Helper - wykonaj operację na urządzeniu z auto-connect/disconnect
async function withDevice(operation) {
    try {
        await device.find();
        await device.connect();
        const result = await operation();
        await device.disconnect();
        return { success: true, ...result };
    } catch (err) {
        console.error("[tuya] Błąd:", err.message);
        return { success: false, error: err.message };
    }
}

// Helper - loguj i ustaw stan
async function setBojlerState(targetState) {
    return withDevice(async () => {
        const currentState = await device.get();
        const stateLabel = currentState ? "🟢 WŁĄCZONY" : "🔴 WYŁĄCZONY";
        console.log(`[tuya] Bojler aktualny stan: ${stateLabel}`);

        if (currentState !== targetState) {
            await device.set({ set: targetState });
            console.log(`[tuya] Bojler ${targetState ? "włączony" : "wyłączony"} ✓`);
            return { changed: true, isOn: targetState };
        }

        console.log(`[tuya] Bojler już ${targetState ? "włączony" : "wyłączony"}, pomijam`);
        return { changed: false, isOn: currentState };
    });
}

// Włącz bojler
export const turnOnBojler = () => setBojlerState(true);

// Wyłącz bojler
export const turnOffBojler = () => setBojlerState(false);

// Pobierz status bojlera
export const getBojlerStatus = () =>
    withDevice(async () => {
        const isOn = await device.get();
        return { isOn };
    });
