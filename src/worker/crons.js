/**
 * Definicje cron jobs
 */

import cron from "node-cron";
import { CRON_FETCH_DATA, CRON_SUNRISE_SUNSET } from "../config/index.js";
import { bojlerState } from "../shared/state.js";
import { fetchSunriseSunset } from "./services/sunService.js";

export const sunriseSunsetJob = cron.schedule(
    CRON_SUNRISE_SUNSET,
    async () => {
        console.log("[cron] Pobieram dane sunrise/sunset...");
        const result = await fetchSunriseSunset();

        if (result.success) {
            bojlerState.sunrise = result.sunrise;
            bojlerState.sunset = result.sunset;
        }
    },
    { scheduled: false }
);

export const fetchDataJob = cron.schedule(
    CRON_FETCH_DATA,
    async () => {
        console.log("[cron] Pobieram dane z FoxESS API...");
        // TODO: Implementacja w kolejnym kroku
    },
    { scheduled: false }
);
