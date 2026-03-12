/**
 * FoxESS Cloud – Entry Point
 * Uruchom: node app.js
 */

import "dotenv/config";
import { createServer } from "./api/server.js";
import { startScheduler } from "./worker/scheduler.js";

function bootstrap() {
    console.log(`\n🚀 FoxESS Proxy`);
    console.log(`📅 ${new Date().toLocaleString("pl-PL")}\n`);

    // Uruchom Web Server
    createServer();

    // Uruchom Scheduler
    startScheduler();

    console.log("");
}

bootstrap();
