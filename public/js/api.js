import { KEY_METRICS, EXTRA_REALTIME_VARS, REPORT_VARS } from "./config.js";
import { log } from "./ui.js";
import { calculateHistoryConsumption, getDayTimestamps } from "./utils.js";

const HISTORY_VARIABLES = [
    "loadsPower",
    "gridConsumptionPower",
    "feedinPower",
    "pvPower",
];

// Pomocnicza funkcja do pobierania tokenu
function getToken() {
    return document.getElementById("apiKey").value.trim();
}

// Pomocnicza funkcja do wykonywania requestów API
async function apiRequest(endpoint, body) {
    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: getToken(), ...body }),
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    if (data.errno !== 0) {
        throw new Error(
            `API errno ${data.errno}: ${data.msg ?? "nieznany błąd"}`
        );
    }

    return data;
}

// Pobieranie danych bieżących
export async function fetchRealtime(sn) {
    log("Pobieranie danych bieżących…", "info");

    const variables = KEY_METRICS.map((m) => m.key).concat(EXTRA_REALTIME_VARS);

    const data = await apiRequest("/api/realtime", { sn, variables });

    const deviceData = data.result?.[0] ?? {};
    const datas = deviceData.datas ?? [];
    const time = deviceData.time ?? null;

    log(`Odebrano ${datas.length} zmiennych`, "ok");

    return { datas, time };
}

// Pobieranie raportu dziennego
export async function fetchReport(sn) {
    log("Pobieranie raportu dziennego…", "info");

    const today = new Date();

    const data = await apiRequest("/api/report", {
        sn,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
        dimension: "day",
        variables: REPORT_VARS.map((v) => v.key),
    });

    return data.result ?? [];
}

// Pobieranie listy elektrowni
export async function fetchPlants() {
    log("Pobieranie listy elektrowni…", "info");

    const data = await apiRequest("/api/plants", {
        currentPage: 1,
        pageSize: 10,
    });

    return data.result ?? [];
}

// Pobieranie danych historycznych i obliczanie zużycia energii
// dateStr: 'YYYY-MM-DD' lub undefined dla dzisiaj
export async function fetchHistory(sn, dateStr) {
    const { begin, end, dateStr: date } = getDayTimestamps(dateStr);

    log(`Pobieranie danych historycznych (${date})…`, "info");

    const data = await apiRequest("/api/history", {
        sn,
        variables: HISTORY_VARIABLES,
        begin,
        end,
    });

    const result = data.result ?? [];

    console.log("API history response:", JSON.stringify(result, null, 2));

    const consumption = calculateHistoryConsumption(result);

    log(
        `Zużycie: PV ${consumption.pv} kWh, dom ${consumption.loads} kWh (${consumption.samples} próbek)`,
        "ok"
    );

    return {
        date,
        raw: result,
        ...consumption,
    };
}
