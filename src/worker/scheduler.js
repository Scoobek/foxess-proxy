/**
 * Scheduler - cykliczne odpytywanie API i automatyka bojlera
 */

import cron from "node-cron";
import { fetchSunriseSunset } from "../lib/sunrisesunset.js";

// Cron: sunrise/sunset - codziennie o 00:01
const sunriseSunsetJob = cron.schedule(
    "1 0 * * *",
    async () => {
        console.log("[cron] Pobieram dane sunrise/sunset...");
        await fetchSunriseSunset();
    },
    { scheduled: false }
);

// Cron: pobieranie danych z FoxESS API - co 5 minut
const fetchDataJob = cron.schedule(
    "*/5 * * * *",
    async () => {
        console.log("[cron] Pobieram dane z FoxESS API...");
        // TODO: Implementacja w kolejnym kroku
    },
    { scheduled: false }
);

export function startScheduler() {
    console.log("✅  Scheduler uruchomiony");

    // Uruchom crony
    sunriseSunsetJob.start();
    fetchDataJob.start();

    // Pobierz sunrise/sunset od razu przy starcie
    fetchSunriseSunset();

    console.log("⏳  Crony aktywne: sunrise/sunset (00:01), fetchData (*/5 min)");
}
