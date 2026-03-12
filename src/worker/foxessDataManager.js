/**
 * FoxESS Data Manager - zarządzanie danymi z FoxESS API
 */

import { bojlerState } from "../shared/state.js";
import { getDaylightStatus } from "../shared/utils/daylight.js";

/**
 * Odświeża dane z FoxESS API z uwzględnieniem okna słonecznego
 * @param {object} job - referencja do cron job (do zatrzymania po sunset)
 */
export async function refreshFoxessData(job) {
    const status = getDaylightStatus(bojlerState.sunrise, bojlerState.sunset);

    if (status === "before") {
        console.log("[foxessDataManager] Przed sunrise - pomijam fetch");
        return;
    }

    if (status === "after") {
        console.log("[foxessDataManager] Po sunset - zatrzymuję job");
        job.stop();
        return;
    }

    if (status === "unknown") {
        console.log("[foxessDataManager] Brak danych sunrise/sunset - pomijam fetch");
        return;
    }

    console.log("[foxessDataManager] Pobieram dane z FoxESS API...");
    // TODO: Implementacja fetch z FoxESS API
}
