/**
 * Bootstrap - inicjalizacja urządzeń przy starcie aplikacji
 */

import { devices } from "../../lib/devices.js";
import { createLogger } from "../../shared/logger.js";

const log = createLogger("bootstrap");

export async function initWorker() {
    log.info("Inicjalizacja workera...");

    for (const device of devices) {
        await device.initDevice();
    }

    log.info("Worker zainicjalizowany");
}
