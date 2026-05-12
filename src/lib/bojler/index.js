/**
 * Bojler - sterowanie urządzeniem i logika auto-control
 */

import { getBojler } from "../config/tuya.js";
import {
    BOJLER_ACTIVATION_THRESHOLD,
    BOJLER_POWER_THRESHOLD,
} from "../config/index.js";
import { updateDeviceState } from "../shared/state.js";
import { createLogger } from "../shared/logger.js";

const log = createLogger("bojler");

export async function initBojlerState() {
    log.info("Pobieranie aktualnego stanu bojlera...");
    const result = await getBojler().getStatus();

    if (result.success) {
        updateDeviceState("bojler", {
            isOn: result.isOn,
            lastCheck: new Date().toISOString(),
        });
        log.info({ isOn: result.isOn }, "Stan bojlera zainicjalizowany");
    } else {
        log.error({ error: result.error }, "Nie udało się pobrać stanu bojlera");
    }

    return result;
}

export function checkBojlerConditions(datas, isOn) {
    const pvPower = datas.find((d) => d.variable === "pvPower")?.value ?? 0;
    const loadsPower =
        datas.find((d) => d.variable === "loadsPower")?.value ?? 0;
    const surplus = pvPower - loadsPower;

    updateDeviceState("bojler", {
        pvPower,
        loadsPower,
        surplus,
        lastCheck: new Date().toISOString(),
    });

    log.info({ pvPower, loadsPower, surplus, isOn }, "Dane PV");

    let shouldTurnOn;

    if (isOn) {
        shouldTurnOn = surplus >= 0;
        if (!shouldTurnOn) {
            log.info({ surplus }, "Brak nadwyżki - wyłączam bojler");
        } else {
            log.info({ surplus }, "Praca bez zmian");
        }
    } else {
        shouldTurnOn =
            pvPower >= BOJLER_ACTIVATION_THRESHOLD &&
            surplus >= BOJLER_ACTIVATION_THRESHOLD;
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

async function setBojlerState(isOn, reason) {
    const device = getBojler();
    const result = isOn ? await device.turnOn() : await device.turnOff();
    if (result.success) {
        updateDeviceState("bojler", {
            isOn,
            lastChange: new Date().toISOString(),
            ...(isOn ? { turnedOnBy: reason } : { turnedOffBy: reason }),
        });
    }
    return result;
}

export async function ensureBojlerOff(reason) {
    const status = await getBojler().getStatus();
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
    const status = await getBojler().getStatus();
    if (!status.success) {
        log.error({ error: status.error }, "Nie można pobrać stanu bojlera");
        return;
    }

    updateDeviceState("bojler", { isOn: status.isOn });

    const shouldTurnOn = checkBojlerConditions(datas, status.isOn);

    if (shouldTurnOn && !status.isOn) {
        await setBojlerState(true, "auto");
    } else if (!shouldTurnOn && status.isOn) {
        await setBojlerState(false, "auto");
    }
}
