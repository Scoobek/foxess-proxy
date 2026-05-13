/**
 * Konfiguracja ogólna aplikacji
 */

export const PORT = 3000;

export const LOCATION_LAT = process.env.LOCATION_LAT;
export const LOCATION_LNG = process.env.LOCATION_LNG;
export const BOJLER_POWER_THRESHOLD = 1.65; // kW
export const BOJLER_TOLERANCY_PERCENTAGE = 0.2; // percent

export const BOJLER_ACTIVATION_THRESHOLD =
    BOJLER_POWER_THRESHOLD * (1 - BOJLER_TOLERANCY_PERCENTAGE);

// Cron schedules
export const CRON_SUNRISE_SUNSET = "1 0 * * *"; // codziennie o 00:01
export const CRON_WEATHER = "*/30 * * * *"; // co 30 minut

// Offset od sunrise w minutach (1.5h = 90 min) - bojler
export const SUNRISE_OFFSET_MINUTES = 90;

// Offsety dla podświetlenia domu (lampki)
export const LAMPKI_SUNSET_OFFSET_MINUTES = 12; // włączenie 12min po sunset
export const LAMPKI_SUNRISE_OFFSET_MINUTES = 35; // wyłączenie 35 min przed sunrise

// Interwał odpytywania API (3.5 minuty)
export const POLLING_INTERVAL_MS = 3.5 * 60 * 1000;

// Tuya - konfiguracja połączenia
export const TUYA_CONNECT_TIMEOUT_MS = 10000;
export const TUYA_OPERATION_TIMEOUT_MS = 8000;
export const TUYA_MAX_RETRIES = 3;
export const TUYA_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minut bez aktywności = rozłączenie
export const TUYA_RETRY_DELAY_MS = 1000;

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
