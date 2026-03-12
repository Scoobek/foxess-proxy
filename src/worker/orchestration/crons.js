/**
 * Definicje cron jobs
 */

import cron from "node-cron";
import { CRON_SUNRISE_SUNSET } from "../../config/index.js";
import { refreshAndSchedule } from "../managers/sunDataManager.js";

/**
 * Cron job pobierający dane sunrise/sunset codziennie o 00:01
 */
export const sunriseSunsetJob = cron.schedule(
    CRON_SUNRISE_SUNSET,
    () => refreshAndSchedule(),
    { scheduled: false }
);
