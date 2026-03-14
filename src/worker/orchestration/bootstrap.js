/**
 * Bootstrap - inicjalizacja stanów workera
 */

import { initBojlerState } from "../../lib/bojler.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("bootstrap");

export async function initWorker() {
    log.info("Inicjalizacja workera...");

    // Pobierz aktualny stan bojlera
    await initBojlerState();

    log.info("Worker zainicjalizowany");
}
