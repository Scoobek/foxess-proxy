/**
 * Scheduler - orchestrator uruchamiania zadań
 */

import { sunriseSunsetJob } from "./crons.js";
import { refreshAndSchedule } from "../managers/sunDataManager.js";
import { getTimerStatus } from "./dayPlanner.js";
import { CRON_SUNRISE_SUNSET } from "../../config/index.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("scheduler");

export async function startScheduler() {
    // Pobierz dane i zaplanuj timery na start
    await refreshAndSchedule();

    // Uruchom cron do codziennego odświeżania
    sunriseSunsetJob.start();

    const status = getTimerStatus();
    log.info({ cron: CRON_SUNRISE_SUNSET, activeDevices: status.activeDevices }, "Scheduler uruchomiony");
}
