/**
 * Konfiguracja ogólna aplikacji
 */

export const PORT = 3000;
export const BOJLER_POWER_THRESHOLD = 1.65; // kW

// Cron schedules
export const CRON_SUNRISE_SUNSET = "1 0 * * *"; // codziennie o 00:01

// Offset od sunrise w minutach (1.5h = 90 min)
export const SUNRISE_OFFSET_MINUTES = 90;

// Interwał odpytywania API (3.5 minuty)
export const POLLING_INTERVAL_MS = 1.5 * 60 * 1000;

// Tuya - konfiguracja połączenia
export const TUYA_CONNECT_TIMEOUT_MS = 10000;
export const TUYA_MAX_RETRIES = 2;

// Zmienne do pobierania z FoxESS API (realtime)
export const REALTIME_VARIABLES = [
    // Kluczowe metryki
    "pvPower",
    "loadsPower",
    "gridConsumptionPower",
    "feedinPower",
    "batChargePower",
    "batDischargePower",
    "SoC",
    "ambientTemperation",
    // Dodatkowe zmienne
    "runningState",
    "pv1Power",
    "pv2Power",
    "pv3Power",
    "pv4Power",
    "pv1Volt",
    "pv2Volt",
    "pv1Current",
    "pv2Current",
    "invBatPower",
    "invTemperation",
    "batTemperature",
    "gridVoltage",
    "gridFrequency",
    "RVolt",
    "SVolt",
    "TVolt",
    "YVolt",
    "BVolt",
];
