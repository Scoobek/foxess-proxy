/**
 * FoxESS Cloud – Entry Point
 * Uruchom: node app.js
 */

import "dotenv/config";
import { createServer } from "./api/server.js";
import { initWorker } from "./worker/orchestration/bootstrap.js";
import { startScheduler } from "./worker/orchestration/scheduler.js";
import { createLogger } from "./shared/logger.js";

const log = createLogger("app");

async function bootstrap() {
    log.info({ date: new Date().toLocaleString("pl-PL") }, "FoxESS Proxy start");

    // Inicjalizacja stanów
    await initWorker();

    // Uruchom Web Server
    createServer();

    // Uruchom Scheduler
    startScheduler();
}

bootstrap();
