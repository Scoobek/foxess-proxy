import { KEY_METRICS, EXTRA_REALTIME_VARS, REPORT_VARS } from "./config.js";
import { log } from "./ui.js";
import { calculateHistoryConsumption } from "./utils.js";

// Zapytanie do API przez lokalny proxy
export async function apiPost(apiPath, body) {
    const apiKey = document.getElementById("apiKey").value.trim();

    const res = await fetch("/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            apiPath,
            token: apiKey,
            body,
        }),
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

    const data = await apiPost("/op/v0/device/real/query", {
        sn,
        variables,
    });

    const result = data.result?.[0]?.datas ?? [];
    log(`Odebrano ${result.length} zmiennych`, "ok");

    return result;
}

// Pobieranie raportu dziennego
export async function fetchReport(sn) {
    log("Pobieranie raportu dziennego…", "info");

    const today = new Date();

    const data = await apiPost("/op/v0/device/report/query", {
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
export async function fetchPlatns() {
    log("Pobieranie listy elektrowni ", "info");

    const data = await apiPost("/op/v0/plant/list", {
        currentPage: 1,
        pageSize: 10,
    });

    return data.result ?? [];
}

// Pobieranie danych historycznych z bieżącego dnia
export async function fetchHistory(sn) {
    log("Pobieranie danych historycznych…", "info");

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const begin = new Date(`${year}-${month}-${day}T00:00:00`).getTime();
    const end = new Date(`${year}-${month}-${day}T23:59:59`).getTime();

    const data = await apiPost("/op/v0/device/history/query", {
        sn,
        variables: [
            "loadsPower",
            "gridConsumptionPower",
            "feedinPower",
            "pvPower",
        ],
        begin,
        end,
    });

    console.log("fetch history");

    const result = data.result ?? [];
    const historyConsumption = calculateHistoryConsumption(data.result);
    console.log(historyConsumption);
    log(`Odebrano ${result.length} serii historycznych`, "ok");

    return result;
}
