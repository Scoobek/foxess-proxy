/**
 * Konfiguracja Tuya - urządzenia
 */

import { TuyaDevice } from "../lib/tuya.js";

// Konfiguracja urządzeń
const DEVICE_CONFIGS = {
    bojler: {
        id: process.env.TUYA_BOJLER_ID,
        key: process.env.TUYA_BOJLER_KEY,
        version: "3.3",
    },
    podswietlenieDomu: {
        id: process.env.TUYA_LAMPKI_ID,
        key: process.env.TUYA_LAMPKI_KEY,
        version: "3.3",
    },
};

// Lazy-init - instancje tworzone przy pierwszym użyciu
const devices = {};

/**
 * Pobiera instancję urządzenia (lazy-init)
 * @param {string} name - nazwa urządzenia z DEVICE_CONFIGS
 * @returns {TuyaDevice}
 */
export function getDevice(name) {
    if (!devices[name]) {
        const config = DEVICE_CONFIGS[name];
        if (!config) {
            throw new Error(`Unknown device: ${name}`);
        }
        devices[name] = new TuyaDevice({ ...config, name });
    }
    return devices[name];
}

/**
 * Pobiera instancję bojlera (wygodny helper)
 * @returns {TuyaDevice}
 */
export const getBojler = () => getDevice("bojler");

/**
 * Pobiera instancję podświetlenia domu (wygodny helper)
 * @returns {TuyaDevice}
 */
export const getPodswietlenieDomu = () => getDevice("podswietlenieDomu");
