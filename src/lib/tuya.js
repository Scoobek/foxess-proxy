/**
 * TuyAPI - komunikacja z urządzeniami Tuya
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

device.on("error", (err) => log.error({ err }, "Błąd urządzenia"));

// Helper - wykonaj operację na urządzeniu z auto-connect/disconnect
async function withDevice(operation) {
    try {
        await device.find();
        await device.connect();
        const result = await operation();
        await device.disconnect();
        return { success: true, ...result };
    } catch (err) {
        log.error({ error: err.message }, "Błąd operacji");
        return { success: false, error: err.message };
    }
}

// Helper - loguj i ustaw stan
async function setBojlerState(targetState) {
    return withDevice(async () => {
        const currentState = await device.get();
        log.debug({ isOn: currentState }, "Aktualny stan bojlera");

        if (currentState !== targetState) {
            await device.set({ set: targetState });
            log.info({ isOn: targetState }, "Bojler przełączony");
            return { changed: true, isOn: targetState };
        }

        log.debug({ isOn: currentState }, "Bojler już w docelowym stanie");
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
