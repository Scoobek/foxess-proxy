/**
 * Scheduler - orchestrator uruchamiania zadań
 */

import { sunriseSunsetJob } from "./crons.js";
import { refreshSunData } from "./sunDataManager.js";
import { scheduleDayTimers, getTimerStatus } from "./dayPlanner.js";
import { CRON_SUNRISE_SUNSET } from "../config/index.js";

export async function startScheduler() {
    // Pobierz dane sunrise/sunset na start
    const result = await refreshSunData();

    if (result.success) {
        // Zaplanuj timery na dzisiejszy dzień
        scheduleDayTimers(result.sunrise, result.sunset);
    }

    // Uruchom cron do codziennego odświeżania danych słonecznych
    sunriseSunsetJob.start();

    const status = getTimerStatus();
    console.log("✅  Scheduler uruchomiony");
    console.log(`⏳  Cron aktywny: sunrise/sunset (${CRON_SUNRISE_SUNSET})`);
    console.log(`📊  Polling: ${status.isPolling ? "aktywny" : "nieaktywny"}`);
}
