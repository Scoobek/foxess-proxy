/**
 * Podświetlenie domu - logika sterowania lampkami i planowania harmonogramu
 */

import { getPodswietlenieDomu } from "../config/tuya.js";
import { updateDeviceState } from "../shared/state.js";
import { createLogger } from "../shared/logger.js";
import {
    LAMPKI_SUNSET_OFFSET_MINUTES,
    LAMPKI_SUNRISE_OFFSET_MINUTES,
} from "../config/index.js";
import { formatMinutesAsTime, msUntilMinutes } from "../shared/utils/time.js";

const log = createLogger("podswietlenieDomu");

// Re-eksport dla interfejsu device registry
export { initLampkiState as initDevice };

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

/**
 * Planuje timery lampek na podstawie sunrise/sunset.
 * Lampki działają w nocy: ON po sunset+offset, OFF przed sunrise-offset.
 * Zwraca funkcję cleanup do wywołania przy kolejnym planowaniu.
 * @param {number} sunriseMin
 * @param {number} sunsetMin
 * @param {number} nowMin
 * @returns {Promise<Function>} cleanup
 */
export async function planDay(sunriseMin, sunsetMin, nowMin) {
    const lampkiOnMin = sunsetMin + LAMPKI_SUNSET_OFFSET_MINUTES;
    const lampkiOffMin = sunriseMin - LAMPKI_SUNRISE_OFFSET_MINUTES;

    log.info(
        {
            lampkiOn: formatMinutesAsTime(lampkiOnMin),
            lampkiOff: formatMinutesAsTime(lampkiOffMin),
            sunsetOffset: LAMPKI_SUNSET_OFFSET_MINUTES,
            sunriseOffset: LAMPKI_SUNRISE_OFFSET_MINUTES,
        },
        "[lampki] Planowanie"
    );

    let onTimer = null;
    let offTimer = null;

    if (nowMin < lampkiOffMin) {
        // Wczesny ranek — lampki powinny być ON
        log.info("[lampki] Przed sunrise-offset - lampki powinny być włączone");
        await ensureLampkiOn("auto");

        offTimer = setTimeout(async () => {
            log.info("[lampki] Sunrise - offset - wyłączam lampki");
            await ensureLampkiOff("sunrise");
        }, msUntilMinutes(lampkiOffMin));

        onTimer = setTimeout(async () => {
            log.info("[lampki] Sunset + offset - włączam lampki");
            await ensureLampkiOn("auto");
        }, msUntilMinutes(lampkiOnMin));

        log.info(
            {
                minutesUntilOff: Math.round(msUntilMinutes(lampkiOffMin) / 60000),
                minutesUntilOn: Math.round(msUntilMinutes(lampkiOnMin) / 60000),
            },
            "[lampki] Timery zaplanowane"
        );
    } else if (nowMin < lampkiOnMin) {
        // Dzień — lampki OFF
        log.info("[lampki] Dzień - lampki powinny być wyłączone");
        await ensureLampkiOff("auto");

        onTimer = setTimeout(async () => {
            log.info("[lampki] Sunset + offset - włączam lampki");
            await ensureLampkiOn("auto");
        }, msUntilMinutes(lampkiOnMin));

        log.info(
            { minutesUntilOn: Math.round(msUntilMinutes(lampkiOnMin) / 60000) },
            "[lampki] Timer ON zaplanowany"
        );
    } else {
        // Po sunset+offset — noc, lampki ON (wyłączenie jutro przy refresh)
        log.info("[lampki] Po sunset+offset - lampki powinny być włączone");
        await ensureLampkiOn("auto");
        log.info("[lampki] Wyłączenie zaplanowane na jutro (przy refresh)");
    }

    return () => {
        if (onTimer) clearTimeout(onTimer);
        if (offTimer) clearTimeout(offTimer);
    };
}
