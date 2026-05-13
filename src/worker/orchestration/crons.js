/**
 * Definicje cron jobs
 */

import cron from "node-cron";
import { CRON_SUNRISE_SUNSET, CRON_WEATHER } from "../../config/index.js";
import { refreshAndSchedule } from "../managers/sunDataManager.js";
import { refreshWeatherData } from "../managers/weatherManager.js";

/**
 * Cron job pobierający dane sunrise/sunset codziennie o 00:01
 */
export const sunriseSunsetJob = cron.schedule(
    CRON_SUNRISE_SUNSET,
    () => refreshAndSchedule(),
    { scheduled: false }
);

/**
 * Cron job pobierający dane pogodowe co godzinę
 */
export const weatherJob = cron.schedule(
    CRON_WEATHER,
    () => refreshWeatherData(),
    { scheduled: false }
);
