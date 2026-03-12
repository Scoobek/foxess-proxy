/**
 * Definicje cron jobs
 */

import cron from "node-cron";
import { CRON_SUNRISE_SUNSET } from "../config/index.js";
import { refreshSunData } from "./sunDataManager.js";
import { scheduleDayTimers } from "./dayPlanner.js";

/**
 * Cron job pobierający dane sunrise/sunset codziennie o 00:01
 * Po pobraniu danych planuje timery na nowy dzień
 */
export const sunriseSunsetJob = cron.schedule(
    CRON_SUNRISE_SUNSET,
    async () => {
        console.log("[cron] Pobieram dane sunrise/sunset...");
        const result = await refreshSunData();

        if (result.success) {
            scheduleDayTimers(result.sunrise, result.sunset);
        }
    },
    { scheduled: false }
);
