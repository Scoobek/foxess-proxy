/**
 * FoxESS Data Manager - zarządzanie danymi z FoxESS API
 */

import { handleBojlerAutoControl } from "../../lib/bojler.js";
import { fetchRealtimeData } from "../services/foxessService.js";
import { REALTIME_VARIABLES } from "../../config/index.js";
import { updateDeviceState } from "../../shared/state.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("foxessDataManager");

/**
 * Wyciąga wartość zmiennej z danych FoxESS
 * @param {Array} datas - tablica danych z API
 * @param {string} variable - nazwa zmiennej
 * @returns {number|null}
 */
function extractValue(datas, variable) {
    const item = datas.find((d) => d.variable === variable);
    return item?.value ?? null;
}

/**
 * Przetwarza dane real-time z falownika i aktualizuje stan
 * @param {object} data - odpowiedź z FoxESS API
 */
export function processRealtimeData(data) {
    if (data.errno !== 0 || !data.result?.[0]?.datas) {
        return;
    }

    const datas = data.result[0].datas;

    // Aktualizacja stanu
    const pvPower = extractValue(datas, "pvPower");
    const loadsPower = extractValue(datas, "loadsPower");
    const surplus =
        pvPower !== null && loadsPower !== null ? pvPower - loadsPower : null;

    updateDeviceState("bojler", {
        pvPower,
        loadsPower,
        surplus,
        lastCheck: new Date().toISOString(),
    });

    // Obsługa bojlera
    handleBojlerAutoControl(datas);
}

/**
 * Pobiera i przetwarza dane real-time z FoxESS API
 * Używane przez dayPlanner do cyklicznego odpytywania
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function refreshRealtimeData() {
    log.debug("Pobieram dane real-time...");

    const result = await fetchRealtimeData(REALTIME_VARIABLES);

    if (result.success) {
        processRealtimeData(result.data);
    } else {
        log.error({ error: result.error }, "Błąd pobierania danych");
    }

    return result;
}
