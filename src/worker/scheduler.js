/**
 * Scheduler - orchestrator uruchamiania cron jobs
 */

import { bojlerState } from "../shared/state.js";
import {
    foxessDataJob,
    sunriseSunsetJob,
    scheduleSunriseOffsetJob,
} from "./crons.js";
import { getDaylightStatus } from "../shared/utils/daylight.js";
import { refreshSunData } from "./sunDataManager.js";
import { CRON_FETCH_DATA } from "../config/index.js";

export async function startScheduler() {
    // Pobierz dane sunrise/sunset na start
    const result = await refreshSunData();

    if (result.success) {
        // Zaplanuj offset job na podstawie pobranych danych
        scheduleSunriseOffsetJob(result.sunrise);
    }

    console.log("✅  Scheduler uruchomiony");

    // Uruchom statyczne cron jobs
    sunriseSunsetJob.start();

    // Uruchom foxessDataJob tylko jeśli jest dzień
    const status = getDaylightStatus(bojlerState.sunrise, bojlerState.sunset);

    if (status === "daylight") {
        foxessDataJob.start();
        console.log(
            `⏳  Crony aktywne: sunrise/sunset (00:01), foxessData (${CRON_FETCH_DATA})`
        );
    } else {
        console.log(
            `⏳  Crony aktywne: sunrise/sunset (00:01), foxessData (nieaktywny - ${status})`
        );
    }
}
