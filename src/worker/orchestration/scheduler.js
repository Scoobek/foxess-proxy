/**
 * Scheduler - orchestrator uruchamiania zadań
 */

import { sunriseSunsetJob } from "./crons.js";
import { refreshAndSchedule } from "../managers/sunDataManager.js";
import { getTimerStatus } from "./dayPlanner.js";
import { CRON_SUNRISE_SUNSET } from "../../config/index.js";

export async function startScheduler() {
    // Pobierz dane i zaplanuj timery na start
    await refreshAndSchedule();

    // Uruchom cron do codziennego odświeżania
    sunriseSunsetJob.start();

    const status = getTimerStatus();
    console.log("✅  Scheduler uruchomiony");
    console.log(`⏳  Cron aktywny: sunrise/sunset (${CRON_SUNRISE_SUNSET})`);
    console.log(`📊  Polling: ${status.isPolling ? "aktywny" : "nieaktywny"}`);
}
