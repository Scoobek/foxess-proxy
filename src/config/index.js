/**
 * Konfiguracja ogólna aplikacji
 */

export const PORT = 3000;
export const BOJLER_POWER_THRESHOLD = 0.2; // kW

// Cron schedules
export const CRON_SUNRISE_SUNSET = "1 0 * * *"; // codziennie o 00:01
export const CRON_FETCH_DATA = "*/5 * * * *"; // co 5 minut

// Offset od sunrise w minutach (1.5h = 90 min)
export const SUNRISE_OFFSET_MINUTES = 90;
