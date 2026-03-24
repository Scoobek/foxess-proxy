/**
 * Bootstrap - inicjalizacja stanów workera
 */

import { initBojlerState } from "../../lib/bojler.js";
import { initLampkiState } from "../../lib/podswietlenieDomu.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("bootstrap");

export async function initWorker() {
    log.info("Inicjalizacja workera...");

    // Pobierz aktualny stan urządzeń
    await initBojlerState();
    await initLampkiState();

    log.info("Worker zainicjalizowany");
}
