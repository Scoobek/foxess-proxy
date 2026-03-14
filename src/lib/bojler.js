/**
 * Bojler - logika auto-control
 */

import { turnOnBojler, turnOffBojler, getBojlerStatus } from "./tuya.js";
import { BOJLER_POWER_THRESHOLD } from "../config/index.js";
import { updateBojlerState } from "../shared/state.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("bojler");

// Inicjalizacja stanu bojlera przy starcie aplikacji
export async function initBojlerState() {
    log.info("Pobieranie aktualnego stanu bojlera...");
    const result = await getBojlerStatus();

    if (result.success) {
        updateBojlerState({
            isOn: result.isOn,
            lastCheck: new Date().toISOString(),
        });
        log.info({ isOn: result.isOn }, "Stan bojlera zainicjalizowany");
    } else {
        log.error(
            { error: result.error },
            "Nie udało się pobrać stanu bojlera"
        );
    }

    return result;
}

/**
 * Sprawdza warunki włączenia/wyłączenia bojlera
 * @param {Array} datas - dane z API (pvPower, loadsPower)
 * @param {boolean} isOn - aktualny stan bojlera
 * @returns {boolean} shouldTurnOn - czy bojler powinien być włączony
 */
export function checkBojlerConditions(datas, isOn) {
    const pvPower = datas.find((d) => d.variable === "pvPower")?.value ?? 0;
    const loadsPower =
        datas.find((d) => d.variable === "loadsPower")?.value ?? 0;
    const surplus = pvPower - loadsPower;

    // Aktualizuj stan z danymi PV
    updateBojlerState({
        pvPower,
        loadsPower,
        surplus,
        lastCheck: new Date().toISOString(),
    });

    log.info({ pvPower, loadsPower, surplus, isOn }, "Dane PV");

    let shouldTurnOn;

    if (isOn) {
        // Bojler działa - loadsPower zawiera już jego zużycie
        // Wyłącz tylko gdy surplus ujemny (brak nadwyżki)
        shouldTurnOn = surplus >= 0;
        if (!shouldTurnOn) {
            log.info({ surplus }, "Brak nadwyżki - wyłączam bojler");
        }
    } else {
        // Bojler wyłączony - sprawdź czy mamy wystarczającą moc i nadwyżkę
        shouldTurnOn =
            pvPower >= BOJLER_POWER_THRESHOLD &&
            surplus >= BOJLER_POWER_THRESHOLD;
        if (shouldTurnOn) {
            log.info("Warunki spełnione - można uruchomić bojler");
        } else {
            log.info(
                { pvPower, surplus, threshold: BOJLER_POWER_THRESHOLD },
                "Warunki niespełnione - bojler pozostaje wyłączony"
            );
        }
    }

    return shouldTurnOn;
}

/**
 * Ustawia stan bojlera (włącza/wyłącza) i aktualizuje state
 * @param {boolean} isOn - docelowy stan
 * @param {string} reason - powód zmiany ('auto' | 'sunset' | 'manual')
 * @returns {Promise<{success: boolean}>}
 */
async function setBojlerState(isOn, reason) {
    const result = isOn ? await turnOnBojler() : await turnOffBojler();
    if (result.success) {
        updateBojlerState({
            isOn,
            lastChange: new Date().toISOString(),
            ...(isOn ? { turnedOnBy: reason } : { turnedOffBy: reason }),
        });
    }
    return result;
}

/**
 * Wyłącza bojler jeśli jest włączony
 * @param {string} reason - powód wyłączenia ('auto' | 'sunset' | 'manual')
 * @returns {Promise<{success: boolean, wasOn: boolean}>}
 */
export async function ensureBojlerOff(reason) {
    const status = await getBojlerStatus();
    if (!status.success) {
        log.error({ error: status.error }, "Nie można pobrać stanu bojlera");
        return { success: false, wasOn: false };
    }

    if (!status.isOn) {
        return { success: true, wasOn: false };
    }

    log.info({ reason }, "Bojler włączony - wyłączam");
    const result = await setBojlerState(false, reason);
    return { success: result.success, wasOn: true };
}

export async function handleBojlerAutoControl(datas) {
    // 1. Pobierz aktualny stan z urządzenia (source of truth)
    const status = await getBojlerStatus();
    if (!status.success) {
        log.error({ error: status.error }, "Nie można pobrać stanu bojlera");
        return;
    }

    // 2. Synchronizuj stan w aplikacji
    updateBojlerState({ isOn: status.isOn });

    // 3. Sprawdź warunki z uwzględnieniem aktualnego stanu
    const shouldTurnOn = checkBojlerConditions(datas, status.isOn);

    // 4. Wykonaj akcję jeśli stan docelowy różni się od aktualnego
    if (shouldTurnOn && !status.isOn) {
        await setBojlerState(true, "auto");
    } else if (!shouldTurnOn && status.isOn) {
        await setBojlerState(false, "auto");
    }
}
