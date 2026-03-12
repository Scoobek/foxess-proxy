/**
 * Definicje cron jobs
 */

import cron from "node-cron";
import {
    CRON_FETCH_DATA,
    CRON_SUNRISE_SUNSET,
    SUNRISE_OFFSET_MINUTES,
} from "../config/index.js";
import { refreshSunData } from "./sunDataManager.js";
import { refreshFoxessData } from "./foxessDataManager.js";
import {
    parseTimeToMinutes,
    minutesToCronExpression,
} from "../shared/utils/time.js";

// Statyczne cron jobs
export const sunriseSunsetJob = cron.schedule(
    CRON_SUNRISE_SUNSET,
    async () => {
        console.log("[cron] Pobieram dane sunrise/sunset...");
        const result = await refreshSunData();

        if (result.success) {
            scheduleSunriseOffsetJob(result.sunrise);
        }
    },
    { scheduled: false }
);

export const foxessDataJob = cron.schedule(
    CRON_FETCH_DATA,
    async () => {
        // Pobieranie danych FoxESS z uwzględnieniem okna słonecznego
        await refreshFoxessData(foxessDataJob);
    },
    { scheduled: false }
);

// Dynamiczny cron - sunrise + offset
let sunriseOffsetJob = null;

/**
 * Planuje cron na sunrise + offset
 * @param {string} sunrise - czas sunrise w formacie "6:07:43 AM"
 */
export function scheduleSunriseOffsetJob(sunrise) {
    // Zatrzymaj poprzedni job jeśli istnieje
    if (sunriseOffsetJob) {
        sunriseOffsetJob.stop();
        sunriseOffsetJob = null;
    }

    const sunriseMinutes = parseTimeToMinutes(sunrise);
    if (sunriseMinutes === null) {
        console.log("[cron] Nie można sparsować sunrise - pomijam offset job");
        return null;
    }

    const targetMinutes = sunriseMinutes + SUNRISE_OFFSET_MINUTES;
    const cronExpression = minutesToCronExpression(targetMinutes);

    if (!cronExpression) {
        console.log("[cron] Nieprawidłowy czas dla offset job");
        return null;
    }

    const targetHours = Math.floor(targetMinutes / 60);
    const targetMins = targetMinutes % 60;
    console.log(
        `[cron] Sunrise offset job: ${targetHours}:${String(targetMins).padStart(2, "0")} (${cronExpression})`
    );

    sunriseOffsetJob = cron.schedule(
        cronExpression,
        () => {
            console.log("[sunriseOffsetJob] Wykonuję akcję o sunrise + 1.5h");
            // TODO: Implementacja akcji
        },
        {
            scheduled: true,
            timezone: "Europe/Warsaw",
        }
    );

    return sunriseOffsetJob;
}

export function getSunriseOffsetJob() {
    return sunriseOffsetJob;
}
