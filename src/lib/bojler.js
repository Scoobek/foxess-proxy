/**
 * Bojler - logika sterowania i planowania harmonogramu
 */

import { getBojler } from "../config/tuya.js";
import {
    BOJLER_ACTIVATION_THRESHOLD,
    BOJLER_POWER_THRESHOLD,
    SUNRISE_OFFSET_MINUTES,
    POLLING_INTERVAL_MS,
} from "../config/index.js";
import { updateDeviceState } from "../shared/state.js";
import { createLogger } from "../shared/logger.js";
import {
    startPolling,
    stopPolling,
} from "../worker/managers/pollingManager.js";
import { refreshRealtimeData } from "../worker/managers/foxessDataManager.js";
import {
    formatMinutesAsTime,
    msUntilMinutes,
    calcNextPollAt,
} from "../shared/utils/time.js";

const log = createLogger("bojler");

// Re-eksport dla interfejsu device registry
export { initBojlerState as initDevice };

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
        log.error(
            { error: result.error },
            "Nie udało się pobrać stanu bojlera"
        );
    }

    return result;
}

/**
 * Sprawdza warunki włączenia/wyłączenia bojlera
 */
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

/**
 * Planuje timery bojlera na podstawie sunrise/sunset.
 * Zwraca funkcję cleanup do wywołania przy kolejnym planowaniu.
 * @param {number} sunriseMin
 * @param {number} sunsetMin
 * @param {number} nowMin
 * @returns {Promise<Function>} cleanup
 */
export async function planDay(sunriseMin, sunsetMin, nowMin) {
    const startMin = sunriseMin + SUNRISE_OFFSET_MINUTES;
    const pollingStartsAt = formatMinutesAsTime(startMin);
    const pollingStopsAt = formatMinutesAsTime(sunsetMin);

    log.info(
        {
            startPolling: pollingStartsAt,
            stopPolling: pollingStopsAt,
            offsetMinutes: SUNRISE_OFFSET_MINUTES,
        },
        "[bojler] Planowanie"
    );

    const pollFn = async () => {
        const result = await refreshRealtimeData();
        if (
            result.success &&
            result.data?.errno === 0 &&
            result.data?.result?.[0]?.datas
        ) {
            await handleBojlerAutoControl(result.data.result[0].datas);
        }
        updateDeviceState("bojler", {
            nextPollAt: calcNextPollAt(POLLING_INTERVAL_MS),
        });
    };

    const doStart = () => {
        updateDeviceState("bojler", {
            isPolling: true,
            pollingStartsAt: null,
            nextPollAt: calcNextPollAt(POLLING_INTERVAL_MS),
        });
        startPolling(pollFn);
    };

    let startTimer = null;
    let stopTimer = null;

    if (nowMin >= startMin && nowMin < sunsetMin) {
        log.info("[bojler] W oknie aktywności - natychmiastowy start");

        updateDeviceState("bojler", { pollingStartsAt: null, pollingStopsAt });

        doStart();

        stopTimer = setTimeout(() => {
            log.info("[bojler] Sunset - zatrzymuję polling");
            stopPolling();
            updateDeviceState("bojler", {
                isPolling: false,
                pollingStopsAt: null,
                nextPollAt: null,
            });
        }, msUntilMinutes(sunsetMin));

        log.info(
            { minutesUntilStop: Math.round(msUntilMinutes(sunsetMin) / 60000) },
            "[bojler] Stop timer zaplanowany"
        );
    } else if (nowMin < startMin) {
        updateDeviceState("bojler", { pollingStartsAt, pollingStopsAt });

        const msToStart = msUntilMinutes(startMin);
        const msToStop = msUntilMinutes(sunsetMin);

        startTimer = setTimeout(() => {
            log.info("[bojler] Sunrise + offset - uruchamiam polling");
            doStart();
        }, msToStart);

        stopTimer = setTimeout(() => {
            log.info("[bojler] Sunset - zatrzymuję polling");
            stopPolling();
            updateDeviceState("bojler", {
                isPolling: false,
                pollingStopsAt: null,
                nextPollAt: null,
            });
        }, msToStop);

        log.info(
            {
                minutesUntilStart: Math.round(msToStart / 60000),
                minutesUntilStop: Math.round(msToStop / 60000),
            },
            "[bojler] Timery zaplanowane"
        );
    } else {
        updateDeviceState("bojler", {
            pollingStartsAt: null,
            pollingStopsAt: null,
            nextPollAt: null,
        });

        await ensureBojlerOff("sunset");

        log.info("[bojler] Po sunset - polling nieaktywny do jutra");
    }

    return () => {
        if (startTimer) clearTimeout(startTimer);
        if (stopTimer) clearTimeout(stopTimer);

        stopPolling();

        updateDeviceState("bojler", {
            isPolling: false,
            nextPollAt: null,
            pollingStopsAt: null,
        });
    };
}
