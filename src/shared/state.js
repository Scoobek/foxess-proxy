/**
 * Współdzielony stan aplikacji
 */

import { createLogger } from "./logger.js";

const log = createLogger("state");

const _listeners = [];

export function onStateChange(fn) {
    _listeners.push(fn);
}

function notify() {
    for (const fn of _listeners) fn(appState);
}

export const appState = {
    // Współdzielone - dane słoneczne
    sunrise: null,
    sunset: null,

    // Urządzenia
    devices: {
        bojler: {
            isOn: false,
            lastChange: null,
            lastCheck: null,
            turnedOnBy: null, // 'auto' | 'manual' | null
            turnedOffBy: null, // 'auto' | 'sunset' | 'manual' | null
            pvPower: 0,
            loadsPower: 0,
            surplus: 0,
            isPolling: false,
            pollingStartsAt: null,
            pollingStopsAt: null,
            nextPollAt: null,
        },
        podswietlenieDomu: {
            isOn: false,
            lastChange: null,
            turnedOnBy: null, // 'auto' | 'manual' | null
            turnedOffBy: null, // 'auto' | 'sunrise' | 'manual' | null
        },
        ac: [],
    },
};

/**
 * Aktualizuje współdzielony stan aplikacji (sunrise, sunset)
 * @param {Object} updates - pola do aktualizacji
 */
export function updateAppState(updates) {
    Object.assign(appState, updates);
    log.debug({ keys: Object.keys(updates) }, "Aktualizacja stanu app");
    notify();
}

/**
 * Aktualizuje stan jednostki AC po id
 * @param {string} id - id urządzenia AC
 * @param {Object} updates - pola do aktualizacji
 */
export function updateAcState(id, updates) {
    const unit = appState.devices.ac.find((u) => u.id === id);
    if (!unit) {
        log.error({ id }, "Nieznane urządzenie AC");
        return;
    }
    Object.assign(unit, updates);
    log.debug({ keys: Object.keys(updates) }, "Aktualizacja stanu app");
    notify();
}

/**
 * Aktualizuje stan konkretnego urządzenia
 * @param {string} device - nazwa urządzenia ('bojler' | 'podswietlenieDomu')
 * @param {Object} updates - pola do aktualizacji
 */
export function updateDeviceState(device, updates) {
    if (!appState.devices[device]) {
        log.error({ device }, "Nieznane urządzenie");
        return;
    }
    Object.assign(appState.devices[device], updates);
    log.debug(
        { device, keys: Object.keys(updates) },
        "Aktualizacja stanu urządzenia"
    );
    notify();
}
