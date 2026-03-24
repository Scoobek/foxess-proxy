/**
 * Podświetlenie domu - logika sterowania lampkami
 */

import { getPodswietlenieDomu } from "../config/tuya.js";
import { updateDeviceState } from "../shared/state.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("podswietlenieDomu");

/**
 * Inicjalizacja stanu lampek przy starcie aplikacji
 */
export async function initLampkiState() {
    log.info("Pobieranie aktualnego stanu lampek...");
    const result = await getPodswietlenieDomu().getStatus();

    if (result.success) {
        updateDeviceState("podswietlenieDomu", {
            isOn: result.isOn,
            lastCheck: new Date().toISOString(),
        });
        log.info({ isOn: result.isOn }, "Stan lampek zainicjalizowany");
    } else {
        log.error({ error: result.error }, "Nie udało się pobrać stanu lampek");
    }

    return result;
}

/**
 * Ustawia stan lampek (włącza/wyłącza) i aktualizuje state
 * @param {boolean} isOn - docelowy stan
 * @param {string} reason - powód zmiany ('auto' | 'manual')
 * @returns {Promise<{success: boolean}>}
 */
async function setLampkiState(isOn, reason) {
    const device = getPodswietlenieDomu();
    const result = isOn ? await device.turnOn() : await device.turnOff();

    if (result.success) {
        updateDeviceState("podswietlenieDomu", {
            isOn,
            lastChange: new Date().toISOString(),
            ...(isOn ? { turnedOnBy: reason } : { turnedOffBy: reason }),
        });
        log.info({ isOn, reason }, "Stan lampek zmieniony");
    } else {
        log.error({ error: result.error, isOn }, "Błąd zmiany stanu lampek");
    }

    return result;
}

/**
 * Włącza lampki jeśli są wyłączone
 * @param {string} reason - powód włączenia ('auto' | 'manual')
 * @returns {Promise<{success: boolean, wasOff: boolean}>}
 */
export async function ensureLampkiOn(reason) {
    const status = await getPodswietlenieDomu().getStatus();
    if (!status.success) {
        log.error({ error: status.error }, "Nie można pobrać stanu lampek");
        return { success: false, wasOff: false };
    }

    if (status.isOn) {
        return { success: true, wasOff: false };
    }

    log.info({ reason }, "Lampki wyłączone - włączam");
    const result = await setLampkiState(true, reason);
    return { success: result.success, wasOff: true };
}

/**
 * Wyłącza lampki jeśli są włączone
 * @param {string} reason - powód wyłączenia ('auto' | 'sunrise' | 'manual')
 * @returns {Promise<{success: boolean, wasOn: boolean}>}
 */
export async function ensureLampkiOff(reason) {
    const status = await getPodswietlenieDomu().getStatus();
    if (!status.success) {
        log.error({ error: status.error }, "Nie można pobrać stanu lampek");
        return { success: false, wasOn: false };
    }

    if (!status.isOn) {
        return { success: true, wasOn: false };
    }

    log.info({ reason }, "Lampki włączone - wyłączam");
    const result = await setLampkiState(false, reason);
    return { success: result.success, wasOn: true };
}
