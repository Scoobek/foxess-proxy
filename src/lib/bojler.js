/**
 * Bojler - logika auto-control
 */

import { turnOnBojler } from "./tuya.js";
import { BOJLER_POWER_THRESHOLD } from "../config/index.js";
import { bojlerState, updateBojlerState } from "../shared/state.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("bojler");

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

    if (shouldTurnOn && !bojlerState.isOn) {
        const result = await turnOnBojler();
        if (result.success) {
            updateBojlerState({
                isOn: true,
                lastChange: new Date().toISOString(),
                turnedOnBy: "auto",
            });
        }
    }
}
