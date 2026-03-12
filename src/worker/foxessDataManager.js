/**
 * FoxESS Data Manager - zarządzanie danymi z FoxESS API
 */

import { bojlerState } from "../shared/state.js";
import { getDaylightStatus } from "../shared/utils/daylight.js";
import { handleBojlerAutoControl } from "../lib/bojler.js";

/**
 * Przetwarza dane real-time z falownika
 * Wywoływane przez route /api/realtime oraz przez cron job
 * @param {object} data - odpowiedź z FoxESS API
 */
export function processRealtimeData(data) {
    if (data.errno === 0 && data.result?.[0]?.datas) {
        const datas = data.result[0].datas;
        handleBojlerAutoControl(datas);
    }
}

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
    // TODO: Implementacja fetch z FoxESS API (wymaga token i sn z konfiguracji)
}
