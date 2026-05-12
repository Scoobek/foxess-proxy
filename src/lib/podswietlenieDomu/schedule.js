/**
 * Podświetlenie domu - harmonogram dzienny (planDay)
 * Interfejs device registry: { initDevice, planDay }
 */

import {
    initLampkiState,
    ensureLampkiOn,
    ensureLampkiOff,
} from "./index.js";
import { createLogger } from "../shared/logger.js";
import {
    LAMPKI_SUNSET_OFFSET_MINUTES,
    LAMPKI_SUNRISE_OFFSET_MINUTES,
} from "../config/index.js";
import { formatMinutesAsTime, msUntilMinutes } from "../shared/utils/time.js";

const log = createLogger("podswietlenieDomu");

export { initLampkiState as initDevice };

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
        log.info("[lampki] Po sunset+offset - lampki powinny być włączone");
        await ensureLampkiOn("auto");
        log.info("[lampki] Wyłączenie zaplanowane na jutro (przy refresh)");
    }

    return () => {
        if (onTimer) clearTimeout(onTimer);
        if (offTimer) clearTimeout(offTimer);
    };
}
