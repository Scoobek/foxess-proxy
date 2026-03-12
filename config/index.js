/**
 * Konfiguracja aplikacji
 */

export const API_KEY = process.env.API_KEY;
export const INVERTER_SN = process.env.INVERTER_SN;

export const PORT = 3000;
export const FOXESS_BASE = "https://www.foxesscloud.com";

export const API_PATHS = {
    realtime: "/op/v0/device/real/query",
    report: "/op/v0/device/report/query",
    plants: "/op/v0/plant/list",
    history: "/op/v0/device/history/query",
};

export const BOJLER_POWER_THRESHOLD = 0.2; // kW
