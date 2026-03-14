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

export function checkBojlerConditions(datas) {
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

    log.info({ pvPower, loadsPower, surplus }, "Dane PV");

    // Warunki: pvPower > threshold AND surplus >= threshold
    const shouldTurnOn =
        pvPower > BOJLER_POWER_THRESHOLD && surplus >= BOJLER_POWER_THRESHOLD;

    if (shouldTurnOn) {
        log.info("Warunki spełnione - można uruchomić bojler");
    }

    return shouldTurnOn;
}

export async function handleBojlerAutoControl(datas) {
    const shouldTurnOn = checkBojlerConditions(datas);

    // Pobierz aktualny stan z urządzenia (source of truth)
    const status = await getBojlerStatus();
    if (!status.success) {
        log.error({ error: status.error }, "Nie można pobrać stanu bojlera");
        return;
    }

    // Synchronizuj stan w aplikacji
    updateBojlerState({ isOn: status.isOn });

    if (shouldTurnOn && !status.isOn) {
        const result = await turnOnBojler();
        if (result.success) {
            updateBojlerState({
                isOn: true,
                lastChange: new Date().toISOString(),
                turnedOnBy: "auto",
            });
        }
    } else if (!shouldTurnOn && status.isOn) {
        const result = await turnOffBojler();
        if (result.success) {
            updateBojlerState({
                isOn: false,
                lastChange: new Date().toISOString(),
                turnedOffBy: "auto",
            });
        }
    }
}
