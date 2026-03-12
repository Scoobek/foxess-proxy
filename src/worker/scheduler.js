/**
 * Scheduler - uruchamianie cron jobs
 */

import { bojlerState } from "../shared/state.js";
import { fetchDataJob, sunriseSunsetJob } from "./crons.js";
import { fetchSunriseSunset } from "./services/sunService.js";

export async function startScheduler() {
    console.log("✅  Scheduler uruchomiony");

    // Uruchom crony
    sunriseSunsetJob.start();
    fetchDataJob.start();

    // Pobierz sunrise/sunset od razu przy starcie
    const result = await fetchSunriseSunset();
    if (result.success) {
        bojlerState.sunrise = result.sunrise;
        bojlerState.sunset = result.sunset;
    }

    console.log("⏳  Crony aktywne: sunrise/sunset (00:01), fetchData (*/5 min)");
}
